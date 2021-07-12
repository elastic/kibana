/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Moment } from 'moment';
import { flow } from 'fp-ts/lib/function';
import { Either, chain, fold, tryCatch } from 'fp-ts/lib/Either';
import { Logger } from '@kbn/logging';
import { ExceptionListItemSchema, ListArray } from '@kbn/securitysolution-io-ts-list-types';
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
import { BuildRuleMessage, buildRuleMessageFactory } from '../signals/rule_messages';
import {
  checkPrivilegesFromEsClient,
  getExceptions,
  getRuleRangeTuples,
  hasReadIndexPrivileges,
  hasTimestampFields,
  isMachineLearningParams,
} from '../signals/utils';
import { RuleParams } from '../schemas/rule_schemas';
import { DEFAULT_MAX_SIGNALS, DEFAULT_SEARCH_AFTER_PAGE_SIZE } from '../../../../common/constants';
import { SecurityAlertTypeReturnValue } from './types';
import { newGetListsClient } from './utils/get_new_list_client';
import { ListClient } from '../../../../../lists/server';
import { AlertAttributes, BulkCreate, WrapHits } from '../signals/types';
import { SavedObject } from '../../../../../../../src/core/server';
import { bulkCreateFactory } from './bulk_create_factory';
import { wrapHitsFactory } from './wrap_hits_factory';
import { ConfigType } from '../../../config';

type SimpleAlertType<
  TParams extends AlertTypeParams = {},
  TAlertInstanceContext extends AlertInstanceContext = {}
> = AlertType<TParams, AlertTypeState, AlertInstanceState, TAlertInstanceContext, string, string>;

export interface RunOpts<TParams extends RuleParams> {
  buildRuleMessage: BuildRuleMessage;
  bulkCreate: BulkCreate;
  exceptionItems: ExceptionListItemSchema[];
  listClient: ListClient;
  rule: SavedObject<AlertAttributes<TParams>>;
  searchAfterSize: number;
  tuple: {
    to: Moment;
    from: Moment;
    maxSignals: number;
  };
  wrapHits: WrapHits;
}

export type SecurityAlertTypeExecutor<
  TServices extends PersistenceServices<TAlertInstanceContext>,
  TParams extends RuleParams,
  TAlertInstanceContext extends AlertInstanceContext = {},
  TState extends AlertTypeState = {}
> = (
  options: Parameters<SimpleAlertType<TParams, TAlertInstanceContext>['executor']>[0] & {
    runOpts: RunOpts<TParams>;
  } & { services: TServices }
) => Promise<SecurityAlertTypeReturnValue<TState>>;

type SecurityAlertTypeWithExecutor<
  TServices extends PersistenceServices<TAlertInstanceContext>,
  TParams extends RuleParams,
  TAlertInstanceContext extends AlertInstanceContext = {},
  TState extends AlertTypeState = {}
> = Omit<
  AlertType<TParams, TState, AlertInstanceState, TAlertInstanceContext, string, string>,
  'executor'
> & {
  executor: SecurityAlertTypeExecutor<TServices, TParams, TAlertInstanceContext, TState>;
};

type CreateSecurityRuleTypeFactory = (options: {
  lists: SetupPlugins['lists'];
  logger: Logger;
  mergeStrategy: ConfigType['alertMergeStrategy'];
  ruleDataClient: RuleDataClient;
}) => <
  TParams extends RuleParams,
  TAlertInstanceContext extends AlertInstanceContext,
  TServices extends PersistenceServices<TAlertInstanceContext>,
  TState extends AlertTypeState = {}
>(
  type: SecurityAlertTypeWithExecutor<TServices, TParams, TAlertInstanceContext, TState>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
) => AlertTypeWithExecutor<TParams, TAlertInstanceContext, any, TState>;

export const createSecurityRuleTypeFactory: CreateSecurityRuleTypeFactory = ({
  lists,
  logger,
  mergeStrategy,
  ruleDataClient,
}) => (type) => {
  const persistenceRuleType = createPersistenceRuleTypeFactory({ ruleDataClient, logger });
  return persistenceRuleType({
    ...type,
    async executor(options) {
      const {
        alertId,
        params,
        previousStartedAt,
        services,
        spaceId,
        updatedBy: updatedByUser,
      } = options;
      const { from, maxSignals, timestampOverride, to } = params;
      const { savedObjectsClient, scopedClusterClient } = services;
      const searchAfterSize = Math.min(maxSignals, DEFAULT_SEARCH_AFTER_PAGE_SIZE);

      const ruleId = type.id;
      const esClient = scopedClusterClient.asCurrentUser;

      const ruleStatusClient = ruleStatusSavedObjectsClientFactory(savedObjectsClient);
      const ruleStatusService = await ruleStatusServiceFactory({
        alertId,
        ruleStatusClient,
      });

      const ruleSO = await savedObjectsClient.get('alert', alertId);
      const {
        actions,
        name,
        schedule: { interval },
      } = ruleSO.attributes;
      const refresh = actions.length ? 'wait_for' : false;

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

      const { listClient, exceptionsClient } = newGetListsClient({
        esClient: services.scopedClusterClient.asCurrentUser,
        updatedByUser,
        spaceId,
        lists,
        savedObjectClient: options.services.savedObjectsClient,
      });

      const exceptionItems = await getExceptions({
        client: exceptionsClient,
        lists: (params.exceptionsList as ListArray) ?? [],
      });

      const bulkCreate = bulkCreateFactory(
        logger,
        services.scopedClusterClient.asCurrentUser,
        buildRuleMessage,
        refresh
      );

      const wrapHits = wrapHitsFactory({
        ruleSO,
        signalsIndex: params.outputIndex,
        mergeStrategy,
      });

      const results: Array<SecurityAlertTypeReturnValue<{}>> = []; // TODO: get alert type state?
      for (const tuple of tuples) {
        results.push(
          await type.executor({
            ...options,
            rule: ruleSO,
            services,
            runOpts: {
              buildRuleMessage,
              bulkCreate,
              exceptionItems,
              listClient,
              rule: ruleSO,
              searchAfterSize,
              tuple,
              wrapHits,
            },
          })
        );
      }

      // TODO: combine results
      const result = results[0];
      return result;
    },
  });
};
