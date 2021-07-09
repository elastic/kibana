/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { flow } from 'fp-ts/lib/function';
import { Either, chain, fold, tryCatch } from 'fp-ts/lib/Either';
import { Logger } from '@kbn/logging';
import { toError } from '@kbn/securitysolution-list-api';
import {
  createPersistenceRuleTypeFactory,
  RuleDataClient,
  AlertTypeWithExecutor,
  PersistenceServices,
} from '../../../../../rule_registry/server';
import { ruleStatusSavedObjectsClientFactory } from '../signals/rule_status_saved_objects_client';
import { ruleStatusServiceFactory } from '../signals/rule_status_service';
import { SetupPlugins } from '../../../../target/types/server/plugin';
import {
  AlertInstanceContext,
  AlertInstanceState,
  AlertTypeParams,
  AlertTypeState,
} from '../../../../../alerting/common';
import { AlertType } from '../../../../../alerting/server';
import { buildRuleMessageFactory } from '../signals/rule_messages';
import {
  checkPrivilegesFromEsClient,
  getRuleRangeTuples,
  hasReadIndexPrivileges,
  hasTimestampFields,
  isMachineLearningParams,
} from '../signals/utils';
import { RuleParams } from '../schemas/rule_schemas';
import { DEFAULT_MAX_SIGNALS } from '../../../../common/constants';
import { SecurityAlertTypeReturnValue } from './types';
// import { AlertTypeExecutor } from '../../../../../rule_registry/server';

type SimpleAlertType<
  TParams extends AlertTypeParams = {},
  TAlertInstanceContext extends AlertInstanceContext = {}
> = AlertType<TParams, AlertTypeState, AlertInstanceState, TAlertInstanceContext, string, string>;

export type SecurityAlertTypeExecutor<
  TParams extends AlertTypeParams = {},
  TAlertInstanceContext extends AlertInstanceContext = {},
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  TServices extends Record<string, any> = {},
  TState extends AlertTypeState = {}
> = (
  options: Parameters<SimpleAlertType<TParams, TAlertInstanceContext>['executor']>[0] & {
    services: TServices;
  }
) => Promise<SecurityAlertTypeReturnValue<TState>>;

type SecurityAlertTypeWithExecutor<
  TParams extends AlertTypeParams = {},
  TAlertInstanceContext extends AlertInstanceContext = {},
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  TServices extends Record<string, any> = {},
  TState extends AlertTypeState = {}
> = Omit<
  AlertType<TParams, TState, AlertInstanceState, TAlertInstanceContext, string, string>,
  'executor'
> & {
  executor: SecurityAlertTypeExecutor<TParams, TAlertInstanceContext, TServices, TState>;
};

type CreateSecurityRuleTypeFactory = (options: {
  lists: SetupPlugins['lists'];
  logger: Logger;
  ruleDataClient: RuleDataClient;
}) => <
  TParams extends RuleParams,
  TAlertInstanceContext extends AlertInstanceContext,
  TServices extends PersistenceServices,
  TState extends AlertTypeState = {}
>(
  type: SecurityAlertTypeWithExecutor<TParams, TAlertInstanceContext, TServices, TState>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
) => AlertTypeWithExecutor<TParams, TAlertInstanceContext, any, TState>;

export const createSecurityRuleTypeFactory: CreateSecurityRuleTypeFactory = ({
  lists,
  logger,
  ruleDataClient,
}) => (type) => {
  const persistenceRuleType = createPersistenceRuleTypeFactory({ ruleDataClient, logger });
  return persistenceRuleType({
    ...type,
    async executor(options) {
      const { alertId, params, previousStartedAt, services } = options;
      const { from, timestampOverride, to } = params;
      const { savedObjectsClient, scopedClusterClient } = services;
      const ruleId = type.id;
      const esClient = scopedClusterClient.asCurrentUser;

      const ruleStatusClient = ruleStatusSavedObjectsClientFactory(savedObjectsClient);
      const ruleStatusService = await ruleStatusServiceFactory({
        alertId,
        ruleStatusClient,
      });

      const savedObject = await savedObjectsClient.get('alert', alertId);
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
        if (!isMachineLearningParams(params)) {
          const index = params.index;
          const hasTimestampOverride = !!timestampOverride;

          // TODO: Input Index
          const inputIndices = ['test'];

          const [privileges, timestampFieldCaps] = await Promise.all([
            checkPrivilegesFromEsClient(esClient, inputIndices),
            esClient.fieldCaps({
              index: index ?? ['*'],
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
                    hasReadIndexPrivileges(privileges, logger, buildRuleMessage, ruleStatusService),
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

      /*
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
      */

      const result = await type.executor(options);

      return result;
      /*
        alertTypeState: state,
        alertInstances: alertInstances,
        previousStartedAt: startedAt,
      */
    },
  });
};
