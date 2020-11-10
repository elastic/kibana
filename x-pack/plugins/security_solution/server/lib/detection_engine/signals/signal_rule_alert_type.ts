/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable complexity */

import { Logger, KibanaRequest } from 'src/core/server';

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
  BaseSignalHit,
} from './types';
import {
  getGapBetweenRuns,
  getListsClient,
  getExceptions,
  getGapMaxCatchupRatio,
  MAX_RULE_GAP_RATIO,
  wrapSignal,
  createErrorsFromShard,
  createSearchAfterReturnType,
  mergeReturns,
  createSearchAfterReturnTypeFromResponse,
} from './utils';
import { signalParamsSchema } from './signal_params_schema';
import { siemRuleActionGroups } from './siem_rule_action_groups';
import { findMlSignals } from './find_ml_signals';
import { findThresholdSignals } from './find_threshold_signals';
import { findPreviousThresholdSignals } from './find_previous_threshold_signals';
import { bulkCreateMlSignals } from './bulk_create_ml_signals';
import { bulkCreateThresholdSignals } from './bulk_create_threshold_signals';
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
import { bulkInsertSignals } from './single_bulk_create';
import { buildSignalFromEvent, buildSignalGroupFromSequence } from './build_bulk_body';
import { createThreatSignals } from './threat_mapping/create_threat_signals';
import { getIndexVersion } from '../routes/index/get_index_version';
import { MIN_EQL_RULE_INDEX_VERSION } from '../routes/index/get_signals_template';

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
      params: signalParamsSchema(),
    },
    producer: SERVER_APP_ID,
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
      await ruleStatusService.goingToRun();

      const gap = getGapBetweenRuns({ previousStartedAt, interval, from, to });
      if (gap != null && gap.asMilliseconds() > 0) {
        const fromUnit = from[from.length - 1];
        const { ratio } = getGapMaxCatchupRatio({
          logger,
          buildRuleMessage,
          previousStartedAt,
          ruleParamsFrom: from,
          interval,
          unit: fromUnit,
        });
        if (ratio && ratio >= MAX_RULE_GAP_RATIO) {
          const gapString = gap.humanize();
          const gapMessage = buildRuleMessage(
            `${gapString} (${gap.asMilliseconds()}ms) has passed since last rule execution, and signals may have been missed.`,
            'Consider increasing your look behind time or adding more Kibana instances.'
          );
          logger.warn(gapMessage);

          hasError = true;
          await ruleStatusService.error(gapMessage, { gap: gapString });
        }
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
          });

          const anomalyCount = anomalyResults.hits.hits.length;
          if (anomalyCount) {
            logger.info(buildRuleMessage(`Found ${anomalyCount} signals from ML anomalies.`));
          }

          const {
            success,
            errors,
            bulkCreateDuration,
            createdItemsCount,
          } = await bulkCreateMlSignals({
            actions,
            throttle,
            someResult: anomalyResults,
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
            (anomalyResults._shards as typeof anomalyResults._shards & { failures: [] }).failures ??
            [];
          const searchErrors = createErrorsFromShard({
            errors: shardFailures,
          });
          result = mergeReturns([
            result,
            createSearchAfterReturnType({
              success: success && anomalyResults._shards.failed === 0,
              errors: [...errors, ...searchErrors],
              createdSignalsCount: createdItemsCount,
              bulkCreateTimes: bulkCreateDuration ? [bulkCreateDuration] : [],
            }),
          ]);
        } else if (isThresholdRule(type) && threshold) {
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

          const {
            searchResult: previousSignals,
            searchErrors: previousSearchErrors,
          } = await findPreviousThresholdSignals({
            indexPattern: [outputIndex],
            from,
            to,
            services,
            logger,
            ruleId,
            bucketByField: threshold.field,
            timestampOverride,
            buildRuleMessage,
          });

          previousSignals.aggregations.rule.threshold.buckets.forEach((bucket: object) => {
            esFilter.bool.filter.push({
              bool: {
                must_not: {
                  bool: {
                    must: [
                      {
                        term: {
                          [threshold.field]: bucket.key,
                        },
                      },
                      {
                        range: {
                          '@timestamp': {
                            lte: bucket.lastSignalTimestamp.value_as_string,
                          },
                        },
                      },
                    ],
                  },
                },
              },
            });
          });

          const { searchResult: thresholdResults, searchErrors } = await findThresholdSignals({
            inputIndexPattern: inputIndex,
            from,
            to,
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
              bulkCreateTimes: bulkCreateDuration ? [bulkCreateDuration] : [],
            }),
          ]);
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
            gap,
            previousStartedAt,
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
            gap,
            previousStartedAt,
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
          try {
            const signalIndexVersion = await getIndexVersion(services.callCluster, outputIndex);
            if (
              signalIndexVersion === undefined ||
              signalIndexVersion < MIN_EQL_RULE_INDEX_VERSION
            ) {
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
          const response: EqlSignalSearchResponse = await services.callCluster(
            'transport.request',
            request
          );
          let newSignals: BaseSignalHit[] | undefined;
          if (response.hits.sequences !== undefined) {
            newSignals = response.hits.sequences.reduce(
              (acc: BaseSignalHit[], sequence) =>
                acc.concat(buildSignalGroupFromSequence(sequence, savedObject, outputIndex)),
              []
            );
          } else if (response.hits.events !== undefined) {
            newSignals = response.hits.events.map((event) =>
              wrapSignal(buildSignalFromEvent(event, savedObject, true), outputIndex)
            );
          } else {
            throw new Error(
              'eql query response should have either `sequences` or `events` but had neither'
            );
          }
          // TODO: replace with code that filters out recursive rule signals while allowing sequences and their building blocks
          // const filteredSignals = filterDuplicateSignals(alertId, newSignals);
          if (newSignals.length > 0) {
            const insertResult = await bulkInsertSignals(newSignals, logger, services, refresh);
            result.bulkCreateTimes.push(insertResult.bulkCreateDuration);
            result.createdSignalsCount += insertResult.createdItemsCount;
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
          if (!hasError) {
            await ruleStatusService.success('succeeded', {
              bulkCreateTimeDurations: result.bulkCreateTimes,
              searchAfterTimeDurations: result.searchAfterTimes,
              lastLookBackDate: result.lastLookBackDate?.toISOString(),
            });
          }
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
