/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { QueryDslQueryContainer } from '@elastic/elasticsearch/api/types';
import { schema } from '@kbn/config-schema';
import type {
  ALERT_EVALUATION_THRESHOLD as ALERT_EVALUATION_THRESHOLD_TYPED,
  ALERT_EVALUATION_VALUE as ALERT_EVALUATION_VALUE_TYPED,
  ALERT_REASON as ALERT_REASON_TYPED,
} from '@kbn/rule-data-utils';
import {
  ALERT_EVALUATION_THRESHOLD as ALERT_EVALUATION_THRESHOLD_NON_TYPED,
  ALERT_EVALUATION_VALUE as ALERT_EVALUATION_VALUE_NON_TYPED,
  ALERT_REASON as ALERT_REASON_NON_TYPED,
  // @ts-expect-error
} from '@kbn/rule-data-utils/target_node/technical_field_names';
import { take } from 'rxjs/operators';
import { asDuration } from '../../../../observability/common/utils/formatters';
import { createLifecycleRuleTypeFactory } from '../../../../rule_registry/server';
import { SearchAggregatedTransactionSetting } from '../../../common/aggregated_transactions';
import {
  AlertType,
  ALERT_TYPES_CONFIG,
  APM_SERVER_FEATURE_ID,
  formatTransactionDurationReason,
} from '../../../common/alert_types';
import {
  PROCESSOR_EVENT,
  SERVICE_NAME,
  TRANSACTION_TYPE,
} from '../../../common/elasticsearch_fieldnames';
import {
  getEnvironmentEsField,
  getEnvironmentLabel,
} from '../../../common/environment_filter_values';
import { ProcessorEvent } from '../../../common/processor_event';
import { environmentQuery } from '../../../common/utils/environment_query';
import { getDurationFormatter } from '../../../common/utils/formatters';
import {
  getDocumentTypeFilterForAggregatedTransactions,
  getTransactionDurationFieldForAggregatedTransactions,
} from '../helpers/aggregated_transactions';
import { getApmIndices } from '../settings/apm_indices/get_apm_indices';
import { apmActionVariables } from './action_variables';
import { alertingEsClient } from './alerting_es_client';
import { RegisterRuleDependencies } from './register_apm_alerts';

const ALERT_EVALUATION_THRESHOLD: typeof ALERT_EVALUATION_THRESHOLD_TYPED =
  ALERT_EVALUATION_THRESHOLD_NON_TYPED;
const ALERT_EVALUATION_VALUE: typeof ALERT_EVALUATION_VALUE_TYPED =
  ALERT_EVALUATION_VALUE_NON_TYPED;
const ALERT_REASON: typeof ALERT_REASON_TYPED = ALERT_REASON_NON_TYPED;

const paramsSchema = schema.object({
  serviceName: schema.string(),
  transactionType: schema.string(),
  windowSize: schema.number(),
  windowUnit: schema.string(),
  threshold: schema.number(),
  aggregationType: schema.oneOf([
    schema.literal('avg'),
    schema.literal('95th'),
    schema.literal('99th'),
  ]),
  environment: schema.string(),
});

const alertTypeConfig = ALERT_TYPES_CONFIG[AlertType.TransactionDuration];

export function registerTransactionDurationAlertType({
  alerting,
  ruleDataClient,
  config$,
  logger,
}: RegisterRuleDependencies) {
  const createLifecycleRuleType = createLifecycleRuleTypeFactory({
    ruleDataClient,
    logger,
  });

  const type = createLifecycleRuleType({
    id: AlertType.TransactionDuration,
    name: alertTypeConfig.name,
    actionGroups: alertTypeConfig.actionGroups,
    defaultActionGroupId: alertTypeConfig.defaultActionGroupId,
    validate: {
      params: paramsSchema,
    },
    actionVariables: {
      context: [
        apmActionVariables.serviceName,
        apmActionVariables.transactionType,
        apmActionVariables.environment,
        apmActionVariables.threshold,
        apmActionVariables.triggerValue,
        apmActionVariables.interval,
      ],
    },
    producer: APM_SERVER_FEATURE_ID,
    minimumLicenseRequired: 'basic',
    isExportable: true,
    executor: async ({ services, params }) => {
      const config = await config$.pipe(take(1)).toPromise();
      const alertParams = params;
      const indices = await getApmIndices({
        config,
        savedObjectsClient: services.savedObjectsClient,
      });

      // only query transaction events when set to 'never',
      // to prevent (likely) unnecessary blocking request
      // in rule execution
      const searchAggregatedTransactions =
        config['xpack.apm.searchAggregatedTransactions'] !==
        SearchAggregatedTransactionSetting.never;

      const index = searchAggregatedTransactions
        ? indices['apm_oss.metricsIndices']
        : indices['apm_oss.transactionIndices'];

      const field = getTransactionDurationFieldForAggregatedTransactions(
        searchAggregatedTransactions
      );

      const searchParams = {
        index,
        body: {
          size: 0,
          query: {
            bool: {
              filter: [
                {
                  range: {
                    '@timestamp': {
                      gte: `now-${alertParams.windowSize}${alertParams.windowUnit}`,
                    },
                  },
                },
                ...getDocumentTypeFilterForAggregatedTransactions(
                  searchAggregatedTransactions
                ),
                { term: { [SERVICE_NAME]: alertParams.serviceName } },
                {
                  term: {
                    [TRANSACTION_TYPE]: alertParams.transactionType,
                  },
                },
                ...environmentQuery(alertParams.environment),
              ] as QueryDslQueryContainer[],
            },
          },
          aggs: {
            latency:
              alertParams.aggregationType === 'avg'
                ? { avg: { field } }
                : {
                    percentiles: {
                      field,
                      percents: [
                        alertParams.aggregationType === '95th' ? 95 : 99,
                      ],
                    },
                  },
          },
        },
      };

      const response = await alertingEsClient({
        scopedClusterClient: services.scopedClusterClient,
        params: searchParams,
      });

      if (!response.aggregations) {
        return {};
      }

      const { latency } = response.aggregations;

      const transactionDuration =
        'values' in latency ? Object.values(latency.values)[0] : latency?.value;

      // Converts threshold to microseconds because this is the unit used on transactionDuration
      const thresholdMicroseconds = alertParams.threshold * 1000;

      if (transactionDuration && transactionDuration > thresholdMicroseconds) {
        const durationFormatter = getDurationFormatter(transactionDuration);
        const transactionDurationFormatted =
          durationFormatter(transactionDuration).formatted;

        services
          .alertWithLifecycle({
            id: `${AlertType.TransactionDuration}_${getEnvironmentLabel(
              alertParams.environment
            )}`,
            fields: {
              [SERVICE_NAME]: alertParams.serviceName,
              ...getEnvironmentEsField(alertParams.environment),
              [TRANSACTION_TYPE]: alertParams.transactionType,
              [PROCESSOR_EVENT]: ProcessorEvent.transaction,
              [ALERT_EVALUATION_VALUE]: transactionDuration,
              [ALERT_EVALUATION_THRESHOLD]: thresholdMicroseconds,
              [ALERT_REASON]: formatTransactionDurationReason({
                measured: transactionDuration,
                serviceName: alertParams.serviceName,
                threshold: thresholdMicroseconds,
                asDuration,
              }),
            },
          })
          .scheduleActions(alertTypeConfig.defaultActionGroupId, {
            transactionType: alertParams.transactionType,
            serviceName: alertParams.serviceName,
            environment: getEnvironmentLabel(alertParams.environment),
            threshold: thresholdMicroseconds,
            triggerValue: transactionDurationFormatted,
            interval: `${alertParams.windowSize}${alertParams.windowUnit}`,
          });
      }

      return {};
    },
  });

  alerting.registerType(type);
}
