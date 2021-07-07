/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { flow } from 'fp-ts/lib/function';
import { Either, chain, fold, tryCatch } from 'fp-ts/lib/Either';
import { Logger } from '@kbn/logging';
import { SavedObjectsClientContract } from 'kibana/server';
import { toError } from '@kbn/securitysolution-list-api';
import { ExceptionListItemSchema, ListArray } from '@kbn/securitysolution-io-ts-list-types';
import {
  createPersistenceRuleTypeFactory,
  PersistenceAlertQueryService,
  PersistenceAlertService,
  RuleDataClient,
  AlertTypeWithExecutor,
} from '../../../../../rule_registry/server';
import { ruleStatusSavedObjectsClientFactory } from '../signals/rule_status_saved_objects_client';
import { ruleStatusServiceFactory } from '../signals/rule_status_service';
import { SetupPlugins } from '../../../../target/types/server/plugin';
import {
  AlertInstanceContext,
  AlertInstanceState,
  AlertTypeParams,
} from '../../../../../alerting/common';
import { AlertAttributes } from '../signals/types';
import { buildRuleMessageFactory } from '../signals/rule_messages';
import {
  checkPrivilegesFromEsClient,
  getExceptions,
  getRuleRangeTuples,
  hasReadIndexPrivileges,
  hasTimestampFields,
  isMachineLearningParams,
} from '../signals/utils';
import { newGetListsClient } from './utils/get_new_list_client';
import { RuleParams } from '../schemas/rule_schemas';
import { DEFAULT_MAX_SIGNALS } from '../../../../common/constants';
import { AlertServices } from '../../../../../alerting/server';
import { ListClient } from '../../../../../lists/server';

interface FactoryOptions {
  ruleDataClient: RuleDataClient;
  logger: Logger;
  lists: SetupPlugins['lists'];
  scopedClusterClient: AlertServices<
    AlertInstanceState,
    AlertInstanceContext,
    'default'
  >['scopedClusterClient'];
  savedObjectsClient: SavedObjectsClientContract;
}

type SecurityRuleType = AlertTypeWithExecutor<
  AlertTypeParams,
  AlertInstanceContext,
  {
    alertWithPersistence: PersistenceAlertService<AlertInstanceContext>;
    findAlerts: PersistenceAlertQueryService;
    securityServices: { exceptionItems: ExceptionListItemSchema[]; listClient: ListClient };
  }
>;

export const createSecurityRuleTypeFactory: (
  factoryOptions: FactoryOptions
) => (type: AlertTypeWithExecutor) => SecurityRuleType = (factoryOptions: FactoryOptions) => {
  const { ruleDataClient, logger, lists, savedObjectsClient, scopedClusterClient } = factoryOptions;
  const persistenceRuleType = createPersistenceRuleTypeFactory({ ruleDataClient, logger });
  return (type: SecurityRuleType) => {
    return persistenceRuleType({
      ...type,
      async executor(options) {
        const { alertId, params, previousStartedAt, services, spaceId, updatedBy } = options;
        const { from, maxSignals, meta, outputIndex, timestampOverride, to } = params;
        const ruleId = type.id;
        const esClient = scopedClusterClient.asCurrentUser;

        const ruleStatusClient = ruleStatusSavedObjectsClientFactory(savedObjectsClient);
        const ruleStatusService = await ruleStatusServiceFactory({
          alertId,
          ruleStatusClient,
        });

        const savedObject = await savedObjectsClient.get<AlertAttributes>('alert', alertId);
        const {
          name,
          schedule: { interval },
        } = savedObject.attributes;

        const buildRuleMessage = buildRuleMessageFactory({
          id: alertId,
          ruleId,
          name,
          index: params.outputIndex as string, // FIXME?
        });

        logger.debug(buildRuleMessage('[+] Starting Signal Rule execution'));
        logger.debug(buildRuleMessage(`interval: ${interval}`));

        let wroteWarningStatus = false;
        await ruleStatusService.goingToRun();

        // check if rule has permissions to access given index pattern
        // move this collection of lines into a function in utils
        // so that we can use it in create rules route, bulk, etc.
        try {
          if (!isMachineLearningParams(params as RuleParams)) {
            // FIXME?
            const index = params.index;
            const hasTimestampOverride = !!timestampOverride;

            // TODO: Input INdex
            const inputIndices = ['test'];

            const [privileges, timestampFieldCaps] = await Promise.all([
              checkPrivilegesFromEsClient(esClient, inputIndices),
              esClient.fieldCaps({
                index: index as string[], // FIXME?
                fields: hasTimestampOverride
                  ? ['@timestamp', timestampOverride as string]
                  : ['@timestamp'],
                include_unmapped: true,
              }),
            ]);

            fold<Error, Promise<boolean>, void>(
              async (error: Error) => logger.error(buildRuleMessage(error.message)),
              async (status: Promise<boolean>) => (wroteWarningStatus = await status)
            )(
              flow(
                () =>
                  tryCatch(
                    () =>
                      hasReadIndexPrivileges(
                        privileges,
                        logger,
                        buildRuleMessage,
                        ruleStatusService
                      ),
                    toError
                  ),
                chain((wroteStatus: unknown) =>
                  tryCatch(
                    () =>
                      hasTimestampFields(
                        wroteStatus as boolean,
                        hasTimestampOverride ? (timestampOverride as string) : '@timestamp',
                        name,
                        timestampFieldCaps,
                        inputIndices,
                        ruleStatusService,
                        logger,
                        buildRuleMessage
                      ),
                    toError
                  )
                )
              )() as Either<Error, Promise<boolean>>
            );
          }
        } catch (exc) {
          logger.error(buildRuleMessage(`Check privileges failed to execute ${exc}`));
        }
        let hasError = false;
        const { tuples, remainingGap } = getRuleRangeTuples({
          logger,
          previousStartedAt,
          from: from as string,
          to: to as string,
          interval,
          maxSignals: DEFAULT_MAX_SIGNALS,
          buildRuleMessage,
        });
        if (remainingGap.asMilliseconds() > 0) {
          const gapString = remainingGap.humanize();
          const gapMessage = buildRuleMessage(
            `${gapString} (${remainingGap.asMilliseconds()}ms) were not queried between this rule execution and the last execution, so signals may have been missed.`,
            'Consider increasing your look behind time or adding more Kibana instances.'
          );
          logger.warn(gapMessage);
          hasError = true;
          await ruleStatusService.error(gapMessage, { gap: gapString });
        }
        const { listClient, exceptionsClient } = newGetListsClient({
          esClient: services.scopedClusterClient.asCurrentUser,
          updatedByUser: updatedBy,
          spaceId,
          lists,
          savedObjectClient: options.services.savedObjectsClient,
        });

        const exceptionItems = await getExceptions({
          client: exceptionsClient,
          lists: (params.exceptionsList as ListArray) ?? [],
        });

        const result = await type.executor({
          ...options,
          services: {
            ...options.services,
            securityServices: {
              exceptionItems,
              listClient,
            },
          },
        });

        return result;
      },
    });
  };
};
