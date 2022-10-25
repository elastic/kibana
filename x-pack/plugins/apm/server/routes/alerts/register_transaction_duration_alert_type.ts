/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { schema } from '@kbn/config-schema';
import {
  ALERT_EVALUATION_THRESHOLD,
  ALERT_EVALUATION_VALUE,
  ALERT_REASON,
} from '@kbn/rule-data-utils';
import { firstValueFrom } from 'rxjs';
import { asDuration } from '@kbn/observability-plugin/common/utils/formatters';
import { createLifecycleRuleTypeFactory } from '@kbn/rule-registry-plugin/server';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import { getAlertUrlTransaction } from '../../../common/utils/formatters';
import { SearchAggregatedTransactionSetting } from '../../../common/aggregated_transactions';
import {
  AlertType,
  AggregationType,
  ALERT_TYPES_CONFIG,
  APM_SERVER_FEATURE_ID,
  formatTransactionDurationReason,
} from '../../../common/alert_types';
import {
  PROCESSOR_EVENT,
  SERVICE_NAME,
  TRANSACTION_TYPE,
  SERVICE_ENVIRONMENT,
} from '../../../common/elasticsearch_fieldnames';
import {
  ENVIRONMENT_NOT_DEFINED,
  getEnvironmentEsField,
  getEnvironmentLabel,
} from '../../../common/environment_filter_values';
import { environmentQuery } from '../../../common/utils/environment_query';
import { getDurationFormatter } from '../../../common/utils/formatters';
import {
  getDocumentTypeFilterForTransactions,
  getDurationFieldForTransactions,
} from '../../lib/helpers/transactions';
import { getApmIndices } from '../settings/apm_indices/get_apm_indices';
import { apmActionVariables } from './action_variables';
import { alertingEsClient } from './alerting_es_client';
import { RegisterRuleDependencies } from './register_apm_alerts';
import { averageOrPercentileAgg } from './average_or_percentile_agg';

const paramsSchema = schema.object({
  serviceName: schema.string(),
  transactionType: schema.string(),
  windowSize: schema.number(),
  windowUnit: schema.string(),
  threshold: schema.number(),
  aggregationType: schema.oneOf([
    schema.literal(AggregationType.Avg),
    schema.literal(AggregationType.P95),
    schema.literal(AggregationType.P99),
  ]),
  environment: schema.string(),
});

const alertTypeConfig = ALERT_TYPES_CONFIG[AlertType.TransactionDuration];

export function registerTransactionDurationAlertType({
  alerting,
  ruleDataClient,
  config$,
  logger,
  basePath,
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
        apmActionVariables.reason,
        apmActionVariables.viewInAppUrl,
      ],
    },
    producer: APM_SERVER_FEATURE_ID,
    minimumLicenseRequired: 'basic',
    isExportable: true,
    executor: async ({ services, params }) => {
      const config = await firstValueFrom(config$);
      const ruleParams = params;
      const indices = await getApmIndices({
        config,
        savedObjectsClient: services.savedObjectsClient,
      });

      // only query transaction events when set to 'never',
      // to prevent (likely) unnecessary blocking request
      // in rule execution
      const searchAggregatedTransactions =
        config.searchAggregatedTransactions !==
        SearchAggregatedTransactionSetting.never;

      const index = searchAggregatedTransactions
        ? indices.metric
        : indices.transaction;

      const field = getDurationFieldForTransactions(
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
                      gte: `now-${ruleParams.windowSize}${ruleParams.windowUnit}`,
                    },
                  },
                },
                ...getDocumentTypeFilterForTransactions(
                  searchAggregatedTransactions
                ),
                { term: { [SERVICE_NAME]: ruleParams.serviceName } },
                {
                  term: {
                    [TRANSACTION_TYPE]: ruleParams.transactionType,
                  },
                },
                ...environmentQuery(ruleParams.environment),
              ] as QueryDslQueryContainer[],
            },
          },
          aggs: {
            environments: {
              terms: {
                field: SERVICE_ENVIRONMENT,
                missing: ENVIRONMENT_NOT_DEFINED.value,
              },
              aggs: averageOrPercentileAgg({
                aggregationType: ruleParams.aggregationType,
                transactionDurationField: field,
              }),
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

      // Converts threshold to microseconds because this is the unit used on transactionDuration
      const thresholdMicroseconds = ruleParams.threshold * 1000;

      const triggeredEnvironmentDurations =
        response.aggregations.environments.buckets
          .map((bucket) => {
            const { key: environment } = bucket;
            const transactionDuration =
              'avgLatency' in bucket // only true if ruleParams.aggregationType === 'avg'
                ? bucket.avgLatency.value
                : bucket.pctLatency.values[0].value;
            return { transactionDuration, environment };
          })
          .filter(
            ({ transactionDuration }) =>
              transactionDuration !== null &&
              transactionDuration > thresholdMicroseconds
          ) as Array<{ transactionDuration: number; environment: string }>;

      for (const {
        environment,
        transactionDuration,
      } of triggeredEnvironmentDurations) {
        const durationFormatter = getDurationFormatter(transactionDuration);
        const transactionDurationFormatted =
          durationFormatter(transactionDuration).formatted;
        const reasonMessage = formatTransactionDurationReason({
          measured: transactionDuration,
          serviceName: ruleParams.serviceName,
          threshold: thresholdMicroseconds,
          asDuration,
          aggregationType: String(ruleParams.aggregationType),
          windowSize: ruleParams.windowSize,
          windowUnit: ruleParams.windowUnit,
        });

        const relativeViewInAppUrl = getAlertUrlTransaction(
          ruleParams.serviceName,
          getEnvironmentEsField(environment)?.[SERVICE_ENVIRONMENT],
          ruleParams.transactionType
        );

        const viewInAppUrl = basePath.publicBaseUrl
          ? new URL(
              basePath.prepend(relativeViewInAppUrl),
              basePath.publicBaseUrl
            ).toString()
          : relativeViewInAppUrl;
        services
          .alertWithLifecycle({
            id: `${AlertType.TransactionDuration}_${getEnvironmentLabel(
              environment
            )}`,
            fields: {
              [SERVICE_NAME]: ruleParams.serviceName,
              ...getEnvironmentEsField(environment),
              [TRANSACTION_TYPE]: ruleParams.transactionType,
              [PROCESSOR_EVENT]: ProcessorEvent.transaction,
              [ALERT_EVALUATION_VALUE]: transactionDuration,
              [ALERT_EVALUATION_THRESHOLD]: thresholdMicroseconds,
              [ALERT_REASON]: reasonMessage,
            },
          })
          .scheduleActions(alertTypeConfig.defaultActionGroupId, {
            transactionType: ruleParams.transactionType,
            serviceName: ruleParams.serviceName,
            environment: getEnvironmentLabel(environment),
            threshold: thresholdMicroseconds,
            triggerValue: transactionDurationFormatted,
            interval: `${ruleParams.windowSize}${ruleParams.windowUnit}`,
            reason: reasonMessage,
            viewInAppUrl,
          });
      }

      return {};
    },
  });

  alerting.registerType(type);
}
