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
import { SetupPlugins } from '../../../plugin';
import { getInputIndex } from './get_input_output_index';
import {
  searchAfterAndBulkCreate,
  SearchAfterAndBulkCreateReturnType,
} from './search_after_bulk_create';
import { getFilter } from './get_filter';
import { SignalRuleAlertTypeDefinition, RuleAlertAttributes } from './types';
import { getGapBetweenRuns, parseScheduleDates, getListsClient, getExceptions } from './utils';
import { signalParamsSchema } from './signal_params_schema';
import { siemRuleActionGroups } from './siem_rule_action_groups';
import { findMlSignals } from './find_ml_signals';
import { bulkCreateMlSignals } from './bulk_create_ml_signals';
import {
  scheduleNotificationActions,
  NotificationRuleTypeParams,
} from '../notifications/schedule_notification_actions';
import { ruleStatusServiceFactory } from './rule_status_service';
import { buildRuleMessageFactory } from './rule_messages';
import { ruleStatusSavedObjectsClientFactory } from './rule_status_saved_objects_client';
import { getNotificationResultsLink } from '../notifications/utils';

export const signalRulesAlertType = ({
  logger,
  version,
  ml,
  lists,
}: {
  logger: Logger;
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
        filters,
        language,
        maxSignals,
        meta,
        machineLearningJobId,
        outputIndex,
        savedId,
        query,
        to,
        type,
        exceptionsList,
      } = params;
      const searchAfterSize = Math.min(maxSignals, DEFAULT_SEARCH_AFTER_PAGE_SIZE);
      let hasError: boolean = false;
      let result: SearchAfterAndBulkCreateReturnType = {
        success: false,
        bulkCreateTimes: [],
        searchAfterTimes: [],
        lastLookBackDate: null,
        createdSignalsCount: 0,
      };
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
        params: ruleParams,
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
        const gapString = gap.humanize();
        const gapMessage = buildRuleMessage(
          `${gapString} (${gap.asMilliseconds()}ms) has passed since last rule execution, and signals may have been missed.`,
          'Consider increasing your look behind time or adding more Kibana instances.'
        );
        logger.warn(gapMessage);

        hasError = true;
        await ruleStatusService.error(gapMessage, { gap: gapString });
      }
      try {
        const { listClient, exceptionsClient } = await getListsClient({
          services,
          updatedByUser,
          spaceId,
          lists,
          savedObjectClient: services.savedObjectsClient,
        });
        const exceptionItems = await getExceptions({
          client: exceptionsClient,
          lists: exceptionsList,
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

          const scopedMlCallCluster = services.getScopedCallCluster(ml.mlClient);
          // Using fake KibanaRequest as it is needed to satisfy the ML Services API, but can be empty as it is
          // currently unused by the jobsSummary function.
          const summaryJobs = await (
            await ml.jobServiceProvider(scopedMlCallCluster, ({} as unknown) as KibanaRequest)
          ).jobsSummary([machineLearningJobId]);
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
            callCluster: scopedMlCallCluster,
            // Using fake KibanaRequest as it is needed to satisfy the ML Services API, but can be empty as it is
            // currently unused by the mlAnomalySearch function.
            request: ({} as unknown) as KibanaRequest,
            jobId: machineLearningJobId,
            anomalyThreshold,
            from,
            to,
          });

          const anomalyCount = anomalyResults.hits.hits.length;
          if (anomalyCount) {
            logger.info(buildRuleMessage(`Found ${anomalyCount} signals from ML anomalies.`));
          }

          const { success, bulkCreateDuration, createdItemsCount } = await bulkCreateMlSignals({
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
          });
          result.success = success;
          result.createdSignalsCount = createdItemsCount;
          if (bulkCreateDuration) {
            result.bulkCreateTimes.push(bulkCreateDuration);
          }
        } else {
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
        }

        if (result.success) {
          if (actions.length) {
            const notificationRuleParams: NotificationRuleTypeParams = {
              ...ruleParams,
              name,
              id: savedObject.id,
            };

            const fromInMs = parseScheduleDates(`now-${interval}`)?.format('x');
            const toInMs = parseScheduleDates('now')?.format('x');

            const resultsLink = getNotificationResultsLink({
              from: fromInMs,
              to: toInMs,
              id: savedObject.id,
              kibanaSiemAppUrl: (meta as { kibana_siem_app_url?: string }).kibana_siem_app_url,
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
            'Bulk Indexing of signals failed. Check logs for further details.'
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
