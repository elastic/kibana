/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable complexity */

import { Logger, KibanaRequest } from 'src/core/server';
import isEmpty from 'lodash/isEmpty';
import { chain, tryCatch } from 'fp-ts/lib/TaskEither';
import { flow } from 'fp-ts/lib/function';
import { performance } from 'perf_hooks';

import { toError, toPromise } from '../../../../common/fp_utils';

import {
  SIGNALS_ID,
  DEFAULT_SEARCH_AFTER_PAGE_SIZE,
  SERVER_APP_ID,
} from '../../../../common/constants';
import { isJobStarted, isMlRule } from '../../../../common/machine_learning/helpers';
import {
  isThresholdRule,
  isEqlRule,
  isThreatMatchRule,
  hasLargeValueItem,
  normalizeThresholdField,
} from '../../../../common/detection_engine/utils';
import { parseScheduleDates } from '../../../../common/detection_engine/parse_schedule_dates';
import { SetupPlugins } from '../../../plugin';
import { getInputIndex } from './get_input_output_index';
import { searchAfterAndBulkCreate } from './search_after_bulk_create';
import { getFilter } from './get_filter';
import {
  SignalRuleAlertTypeDefinition,
  RuleAlertAttributes,
  EqlSignalSearchResponse,
  WrappedSignalHit,
} from './types';
import {
  getListsClient,
  getExceptions,
  wrapSignal,
  createErrorsFromShard,
  createSearchAfterReturnType,
  mergeReturns,
  createSearchAfterReturnTypeFromResponse,
  checkPrivileges,
  hasTimestampFields,
  hasReadIndexPrivileges,
  makeFloatString,
  getRuleRangeTuples,
} from './utils';
import { signalParamsSchema } from './signal_params_schema';
import { siemRuleActionGroups } from './siem_rule_action_groups';
import { findMlSignals } from './find_ml_signals';
import {
  bulkCreateThresholdSignals,
  getThresholdBucketFilters,
  getThresholdSignalHistory,
  findThresholdSignals,
} from './threshold';
import { bulkCreateMlSignals } from './bulk_create_ml_signals';
import {
  scheduleNotificationActions,
  NotificationRuleTypeParams,
} from '../notifications/schedule_notification_actions';
import { ruleStatusServiceFactory } from './rule_status_service';
import { buildRuleMessageFactory } from './rule_messages';
import { ruleStatusSavedObjectsClientFactory } from './rule_status_saved_objects_client';
import { getNotificationResultsLink } from '../notifications/utils';
import { TelemetryEventsSender } from '../../telemetry/sender';
import { buildEqlSearchRequest } from '../../../../common/detection_engine/get_query_filter';
import { bulkInsertSignals, filterDuplicateSignals } from './single_bulk_create';
import { buildSignalFromEvent, buildSignalGroupFromSequence } from './build_bulk_body';
import { createThreatSignals } from './threat_mapping/create_threat_signals';
import { getIndexVersion } from '../routes/index/get_index_version';
import { MIN_EQL_RULE_INDEX_VERSION } from '../routes/index/get_signals_template';
import { filterEventsAgainstList } from './filters/filter_events_against_list';
import { isOutdated } from '../migrations/helpers';
import { RuleTypeParams } from '../types';

export const signalRulesAlertType = ({
  logger,
  eventsTelemetry,
  version,
  ml,
  lists,
}: {
  logger: Logger;
  eventsTelemetry: TelemetryEventsSender | undefined;
  version: string;
  ml: SetupPlugins['ml'];
  lists: SetupPlugins['lists'] | undefined;
}): SignalRuleAlertTypeDefinition => {
  return {
    id: SIGNALS_ID,
    name: 'SIEM signal',
    actionGroups: siemRuleActionGroups,
    defaultActionGroupId: 'default',
    validate: {
      /**
       * TODO: Fix typing inconsistancy between `RuleTypeParams` and `CreateRulesOptions`
       * Once that's done, you should be able to do:
       * ```
       * params: signalParamsSchema(),
       * ```
       */
      params: (signalParamsSchema() as unknown) as {
        validate: (object: unknown) => RuleTypeParams;
      },
    },
    producer: SERVER_APP_ID,
    minimumLicenseRequired: 'basic',
    async executor({
      previousStartedAt,
      startedAt,
      alertId,
      services,
      params,
      spaceId,
      updatedBy: updatedByUser,
    }) {
      const {
        anomalyThreshold,
        from,
        ruleId,
        index,
        eventCategoryOverride,
        filters,
        language,
        maxSignals,
        meta,
        machineLearningJobId,
        outputIndex,
        savedId,
        query,
        to,
        threshold,
        threatFilters,
        threatQuery,
        threatIndex,
        threatIndicatorPath,
        threatMapping,
        threatLanguage,
        timestampOverride,
        type,
        exceptionsList,
        concurrentSearches,
        itemsPerSearch,
      } = params;

      const searchAfterSize = Math.min(maxSignals, DEFAULT_SEARCH_AFTER_PAGE_SIZE);
      let hasError: boolean = false;
      let result = createSearchAfterReturnType();
      const ruleStatusClient = ruleStatusSavedObjectsClientFactory(services.savedObjectsClient);
      const ruleStatusService = await ruleStatusServiceFactory({
        alertId,
        ruleStatusClient,
      });
      const savedObject = await services.savedObjectsClient.get<RuleAlertAttributes>(
        'alert',
        alertId
      );
      const {
        actions,
        name,
        tags,
        createdAt,
        createdBy,
        updatedBy,
        enabled,
        schedule: { interval },
        throttle,
      } = savedObject.attributes;
      const updatedAt = savedObject.updated_at ?? '';
      const refresh = actions.length ? 'wait_for' : false;
      const buildRuleMessage = buildRuleMessageFactory({
        id: alertId,
        ruleId,
        name,
        index: outputIndex,
      });

      logger.debug(buildRuleMessage('[+] Starting Signal Rule execution'));
      logger.debug(buildRuleMessage(`interval: ${interval}`));
      let wroteWarningStatus = false;
      await ruleStatusService.goingToRun();

      // check if rule has permissions to access given index pattern
      // move this collection of lines into a function in utils
      // so that we can use it in create rules route, bulk, etc.
      try {
        if (!isEmpty(index)) {
          const hasTimestampOverride = timestampOverride != null && !isEmpty(timestampOverride);
          const inputIndices = await getInputIndex(services, version, index);
          const [privileges, timestampFieldCaps] = await Promise.all([
            checkPrivileges(services, inputIndices),
            services.scopedClusterClient.fieldCaps({
              index,
              fields: hasTimestampOverride
                ? ['@timestamp', timestampOverride as string]
                : ['@timestamp'],
              include_unmapped: true,
            }),
          ]);

          wroteWarningStatus = await flow(
            () =>
              tryCatch(
                () =>
                  hasReadIndexPrivileges(privileges, logger, buildRuleMessage, ruleStatusService),
                toError
              ),
            chain((wroteStatus) =>
              tryCatch(
                () =>
                  hasTimestampFields(
                    wroteStatus,
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
            ),
            toPromise
          )();
        }
      } catch (exc) {
        logger.error(buildRuleMessage(`Check privileges failed to execute ${exc}`));
      }
      const { tuples, remainingGap } = getRuleRangeTuples({
        logger,
        previousStartedAt,
        from,
        to,
        interval,
        maxSignals,
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
      try {
        const { listClient, exceptionsClient } = getListsClient({
          services,
          updatedByUser,
          spaceId,
          lists,
          savedObjectClient: services.savedObjectsClient,
        });
        const exceptionItems = await getExceptions({
          client: exceptionsClient,
          lists: exceptionsList ?? [],
        });

        if (isMlRule(type)) {
          if (ml == null) {
            throw new Error('ML plugin unavailable during rule execution');
          }
          if (machineLearningJobId == null || anomalyThreshold == null) {
            throw new Error(
              [
                'Machine learning rule is missing job id and/or anomaly threshold:',
                `job id: "${machineLearningJobId}"`,
                `anomaly threshold: "${anomalyThreshold}"`,
              ].join(' ')
            );
          }

          // Using fake KibanaRequest as it is needed to satisfy the ML Services API, but can be empty as it is
          // currently unused by the jobsSummary function.
          const fakeRequest = {} as KibanaRequest;
          const summaryJobs = await ml
            .jobServiceProvider(fakeRequest, services.savedObjectsClient)
            .jobsSummary([machineLearningJobId]);
          const jobSummary = summaryJobs.find((job) => job.id === machineLearningJobId);

          if (jobSummary == null || !isJobStarted(jobSummary.jobState, jobSummary.datafeedState)) {
            const errorMessage = buildRuleMessage(
              'Machine learning job is not started:',
              `job id: "${machineLearningJobId}"`,
              `job status: "${jobSummary?.jobState}"`,
              `datafeed status: "${jobSummary?.datafeedState}"`
            );
            logger.warn(errorMessage);
            hasError = true;
            await ruleStatusService.error(errorMessage);
          }

          const anomalyResults = await findMlSignals({
            ml,
            // Using fake KibanaRequest as it is needed to satisfy the ML Services API, but can be empty as it is
            // currently unused by the mlAnomalySearch function.
            request: ({} as unknown) as KibanaRequest,
            savedObjectsClient: services.savedObjectsClient,
            jobId: machineLearningJobId,
            anomalyThreshold,
            from,
            to,
            exceptionItems: exceptionItems ?? [],
          });

          const filteredAnomalyResults = await filterEventsAgainstList({
            listClient,
            exceptionsList: exceptionItems ?? [],
            logger,
            eventSearchResult: anomalyResults,
            buildRuleMessage,
          });

          const anomalyCount = filteredAnomalyResults.hits.hits.length;
          if (anomalyCount) {
            logger.info(buildRuleMessage(`Found ${anomalyCount} signals from ML anomalies.`));
          }

          const {
            success,
            errors,
            bulkCreateDuration,
            createdItemsCount,
            createdItems,
          } = await bulkCreateMlSignals({
            actions,
            throttle,
            someResult: filteredAnomalyResults,
            ruleParams: params,
            services,
            logger,
            id: alertId,
            signalsIndex: outputIndex,
            name,
            createdBy,
            createdAt,
            updatedBy,
            updatedAt,
            interval,
            enabled,
            refresh,
            tags,
            buildRuleMessage,
          });
          // The legacy ES client does not define failures when it can be present on the structure, hence why I have the & { failures: [] }
          const shardFailures =
            (filteredAnomalyResults._shards as typeof filteredAnomalyResults._shards & {
              failures: [];
            }).failures ?? [];
          const searchErrors = createErrorsFromShard({
            errors: shardFailures,
          });
          result = mergeReturns([
            result,
            createSearchAfterReturnType({
              success: success && filteredAnomalyResults._shards.failed === 0,
              errors: [...errors, ...searchErrors],
              createdSignalsCount: createdItemsCount,
              createdSignals: createdItems,
              bulkCreateTimes: bulkCreateDuration ? [bulkCreateDuration] : [],
            }),
          ]);
        } else if (isThresholdRule(type) && threshold) {
          if (hasLargeValueItem(exceptionItems ?? [])) {
            await ruleStatusService.partialFailure(
              'Exceptions that use "is in list" or "is not in list" operators are not applied to Threshold rules'
            );
            wroteWarningStatus = true;
          }
          const inputIndex = await getInputIndex(services, version, index);

          for (const tuple of tuples) {
            const {
              thresholdSignalHistory,
              searchErrors: previousSearchErrors,
            } = await getThresholdSignalHistory({
              indexPattern: [outputIndex],
              from: tuple.from.toISOString(),
              to: tuple.to.toISOString(),
              services,
              logger,
              ruleId,
              bucketByFields: normalizeThresholdField(threshold.field),
              timestampOverride,
              buildRuleMessage,
            });

            const bucketFilters = await getThresholdBucketFilters({
              thresholdSignalHistory,
              timestampOverride,
            });

            const esFilter = await getFilter({
              type,
              filters: filters ? filters.concat(bucketFilters) : bucketFilters,
              language,
              query,
              savedId,
              services,
              index: inputIndex,
              lists: exceptionItems ?? [],
            });

            const {
              searchResult: thresholdResults,
              searchErrors,
              searchDuration: thresholdSearchDuration,
            } = await findThresholdSignals({
              inputIndexPattern: inputIndex,
              from: tuple.from.toISOString(),
              to: tuple.to.toISOString(),
              services,
              logger,
              filter: esFilter,
              threshold,
              timestampOverride,
              buildRuleMessage,
            });

            const {
              success,
              bulkCreateDuration,
              createdItemsCount,
              createdItems,
              errors,
            } = await bulkCreateThresholdSignals({
              actions,
              throttle,
              someResult: thresholdResults,
              ruleParams: params,
              filter: esFilter,
              services,
              logger,
              id: alertId,
              inputIndexPattern: inputIndex,
              signalsIndex: outputIndex,
              timestampOverride,
              startedAt,
              from: tuple.from.toDate(),
              name,
              createdBy,
              createdAt,
              updatedBy,
              updatedAt,
              interval,
              enabled,
              refresh,
              tags,
              thresholdSignalHistory,
              buildRuleMessage,
            });

            result = mergeReturns([
              result,
              createSearchAfterReturnTypeFromResponse({
                searchResult: thresholdResults,
                timestampOverride,
              }),
              createSearchAfterReturnType({
                success,
                errors: [...errors, ...previousSearchErrors, ...searchErrors],
                createdSignalsCount: createdItemsCount,
                createdSignals: createdItems,
                bulkCreateTimes: bulkCreateDuration ? [bulkCreateDuration] : [],
                searchAfterTimes: [thresholdSearchDuration],
              }),
            ]);
          }
        } else if (isThreatMatchRule(type)) {
          if (
            threatQuery == null ||
            threatIndex == null ||
            threatMapping == null ||
            query == null
          ) {
            throw new Error(
              [
                'Indicator match is missing threatQuery and/or threatIndex and/or threatMapping:',
                `threatQuery: "${threatQuery}"`,
                `threatIndex: "${threatIndex}"`,
                `threatMapping: "${threatMapping}"`,
              ].join(' ')
            );
          }
          const inputIndex = await getInputIndex(services, version, index);
          result = await createThreatSignals({
            tuples,
            threatMapping,
            query,
            inputIndex,
            type,
            filters: filters ?? [],
            language,
            name,
            savedId,
            services,
            exceptionItems: exceptionItems ?? [],
            listClient,
            logger,
            eventsTelemetry,
            alertId,
            outputIndex,
            params,
            searchAfterSize,
            actions,
            createdBy,
            createdAt,
            updatedBy,
            interval,
            updatedAt,
            enabled,
            refresh,
            tags,
            throttle,
            threatFilters: threatFilters ?? [],
            threatQuery,
            threatLanguage,
            buildRuleMessage,
            threatIndex,
            threatIndicatorPath,
            concurrentSearches: concurrentSearches ?? 1,
            itemsPerSearch: itemsPerSearch ?? 9000,
          });
        } else if (type === 'query' || type === 'saved_query') {
          const inputIndex = await getInputIndex(services, version, index);
          const esFilter = await getFilter({
            type,
            filters,
            language,
            query,
            savedId,
            services,
            index: inputIndex,
            lists: exceptionItems ?? [],
          });

          result = await searchAfterAndBulkCreate({
            tuples,
            listClient,
            exceptionsList: exceptionItems ?? [],
            ruleParams: params,
            services,
            logger,
            eventsTelemetry,
            id: alertId,
            inputIndexPattern: inputIndex,
            signalsIndex: outputIndex,
            filter: esFilter,
            actions,
            name,
            createdBy,
            createdAt,
            updatedBy,
            updatedAt,
            interval,
            enabled,
            pageSize: searchAfterSize,
            refresh,
            tags,
            throttle,
            buildRuleMessage,
          });
        } else if (isEqlRule(type)) {
          if (query === undefined) {
            throw new Error('EQL query rule must have a query defined');
          }
          if (hasLargeValueItem(exceptionItems ?? [])) {
            await ruleStatusService.partialFailure(
              'Exceptions that use "is in list" or "is not in list" operators are not applied to EQL rules'
            );
            wroteWarningStatus = true;
          }
          try {
            const signalIndexVersion = await getIndexVersion(services.callCluster, outputIndex);
            if (isOutdated({ current: signalIndexVersion, target: MIN_EQL_RULE_INDEX_VERSION })) {
              throw new Error(
                `EQL based rules require an update to version ${MIN_EQL_RULE_INDEX_VERSION} of the detection alerts index mapping`
              );
            }
          } catch (err) {
            if (err.statusCode === 403) {
              throw new Error(
                `EQL based rules require the user that created it to have the view_index_metadata, read, and write permissions for index: ${outputIndex}`
              );
            } else {
              throw err;
            }
          }
          const inputIndex = await getInputIndex(services, version, index);
          const request = buildEqlSearchRequest(
            query,
            inputIndex,
            from,
            to,
            searchAfterSize,
            timestampOverride,
            exceptionItems ?? [],
            eventCategoryOverride
          );
          const eqlSignalSearchStart = performance.now();
          const response: EqlSignalSearchResponse = await services.callCluster(
            'transport.request',
            request
          );
          const eqlSignalSearchEnd = performance.now();
          const eqlSearchDuration = makeFloatString(eqlSignalSearchEnd - eqlSignalSearchStart);
          result.searchAfterTimes = [eqlSearchDuration];
          let newSignals: WrappedSignalHit[] | undefined;
          if (response.hits.sequences !== undefined) {
            newSignals = response.hits.sequences.reduce(
              (acc: WrappedSignalHit[], sequence) =>
                acc.concat(buildSignalGroupFromSequence(sequence, savedObject, outputIndex)),
              []
            );
          } else if (response.hits.events !== undefined) {
            newSignals = filterDuplicateSignals(
              savedObject.id,
              response.hits.events.map((event) =>
                wrapSignal(buildSignalFromEvent(event, savedObject, true), outputIndex)
              )
            );
          } else {
            throw new Error(
              'eql query response should have either `sequences` or `events` but had neither'
            );
          }
          if (newSignals.length > 0) {
            const insertResult = await bulkInsertSignals(newSignals, logger, services, refresh);
            result.bulkCreateTimes.push(insertResult.bulkCreateDuration);
            result.createdSignalsCount += insertResult.createdItemsCount;
            result.createdSignals = insertResult.createdItems;
          }
          result.success = true;
        } else {
          throw new Error(`unknown rule type ${type}`);
        }

        if (result.success) {
          if (actions.length) {
            const notificationRuleParams: NotificationRuleTypeParams = {
              ...params,
              name,
              id: savedObject.id,
            };

            const fromInMs = parseScheduleDates(`now-${interval}`)?.format('x');
            const toInMs = parseScheduleDates('now')?.format('x');
            const resultsLink = getNotificationResultsLink({
              from: fromInMs,
              to: toInMs,
              id: savedObject.id,
              kibanaSiemAppUrl: (meta as { kibana_siem_app_url?: string } | undefined)
                ?.kibana_siem_app_url,
            });

            logger.info(
              buildRuleMessage(`Found ${result.createdSignalsCount} signals for notification.`)
            );

            if (result.createdSignalsCount) {
              const alertInstance = services.alertInstanceFactory(alertId);
              scheduleNotificationActions({
                alertInstance,
                signalsCount: result.createdSignalsCount,
                signals: result.createdSignals,
                resultsLink,
                ruleParams: notificationRuleParams,
              });
            }
          }

          logger.debug(buildRuleMessage('[+] Signal Rule execution completed.'));
          logger.debug(
            buildRuleMessage(
              `[+] Finished indexing ${result.createdSignalsCount} signals into ${outputIndex}`
            )
          );
          if (!hasError && !wroteWarningStatus) {
            await ruleStatusService.success('succeeded', {
              bulkCreateTimeDurations: result.bulkCreateTimes,
              searchAfterTimeDurations: result.searchAfterTimes,
              lastLookBackDate: result.lastLookBackDate?.toISOString(),
            });
          }

          // adding this log line so we can get some information from cloud
          logger.info(
            buildRuleMessage(
              `[+] Finished indexing ${result.createdSignalsCount}  ${
                !isEmpty(result.totalToFromTuples)
                  ? `signals searched between date ranges ${JSON.stringify(
                      result.totalToFromTuples,
                      null,
                      2
                    )}`
                  : ''
              }`
            )
          );
        } else {
          const errorMessage = buildRuleMessage(
            'Bulk Indexing of signals failed:',
            result.errors.join()
          );
          logger.error(errorMessage);
          await ruleStatusService.error(errorMessage, {
            bulkCreateTimeDurations: result.bulkCreateTimes,
            searchAfterTimeDurations: result.searchAfterTimes,
            lastLookBackDate: result.lastLookBackDate?.toISOString(),
          });
        }
      } catch (error) {
        const errorMessage = error.message ?? '(no error message given)';
        const message = buildRuleMessage(
          'An error occurred during rule execution:',
          `message: "${errorMessage}"`
        );

        logger.error(message);
        await ruleStatusService.error(message, {
          bulkCreateTimeDurations: result.bulkCreateTimes,
          searchAfterTimeDurations: result.searchAfterTimes,
          lastLookBackDate: result.lastLookBackDate?.toISOString(),
        });
      }
    },
  };
};
