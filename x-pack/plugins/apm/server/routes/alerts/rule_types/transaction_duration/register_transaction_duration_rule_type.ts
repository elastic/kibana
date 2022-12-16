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
import { termQuery } from '@kbn/observability-plugin/server';
import { createLifecycleRuleTypeFactory } from '@kbn/rule-registry-plugin/server';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import { getAlertDetailsUrl } from '@kbn/infra-plugin/server/lib/alerting/common/utils';
import { addSpaceIdToPath } from '@kbn/spaces-plugin/common';
import { getAlertUrlTransaction } from '../../../../../common/utils/formatters';
import { SearchAggregatedTransactionSetting } from '../../../../../common/aggregated_transactions';
import {
  ApmRuleType,
  AggregationType,
  RULE_TYPES_CONFIG,
  APM_SERVER_FEATURE_ID,
  formatTransactionDurationReason,
} from '../../../../../common/rules/apm_rule_types';
import {
  PROCESSOR_EVENT,
  SERVICE_NAME,
  TRANSACTION_TYPE,
  SERVICE_ENVIRONMENT,
} from '../../../../../common/es_fields/apm';
import {
  ENVIRONMENT_NOT_DEFINED,
  getEnvironmentEsField,
  getEnvironmentLabel,
} from '../../../../../common/environment_filter_values';
import { environmentQuery } from '../../../../../common/utils/environment_query';
import { getDurationFormatter } from '../../../../../common/utils/formatters';
import {
  getDocumentTypeFilterForTransactions,
  getDurationFieldForTransactions,
} from '../../../../lib/helpers/transactions';
import { getApmIndices } from '../../../settings/apm_indices/get_apm_indices';
import { apmActionVariables } from '../../action_variables';
import { alertingEsClient } from '../../alerting_es_client';
import { RegisterRuleDependencies } from '../../register_apm_rule_types';
import {
  averageOrPercentileAgg,
  getMultiTermsSortOrder,
} from './average_or_percentile_agg';
import {
  getServiceGroupFields,
  getServiceGroupFieldsAgg,
} from '../get_service_group_fields';

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

const ruleTypeConfig = RULE_TYPES_CONFIG[ApmRuleType.TransactionDuration];

export function registerTransactionDurationRuleType({
  alerting,
  ruleDataClient,
  config$,
  logger,
  observability,
  basePath,
}: RegisterRuleDependencies) {
  const createLifecycleRuleType = createLifecycleRuleTypeFactory({
    ruleDataClient,
    logger,
  });

  const ruleType = createLifecycleRuleType({
    id: ApmRuleType.TransactionDuration,
    name: ruleTypeConfig.name,
    actionGroups: ruleTypeConfig.actionGroups,
    defaultActionGroupId: ruleTypeConfig.defaultActionGroupId,
    validate: {
      params: paramsSchema,
    },
    actionVariables: {
      context: [
        ...(observability.getAlertDetailsConfig()?.apm.enabled
          ? [apmActionVariables.alertDetailsUrl]
          : []),
        apmActionVariables.environment,
        apmActionVariables.interval,
        apmActionVariables.reason,
        apmActionVariables.serviceName,
        apmActionVariables.transactionType,
        apmActionVariables.threshold,
        apmActionVariables.triggerValue,
        apmActionVariables.viewInAppUrl,
      ],
    },
    producer: APM_SERVER_FEATURE_ID,
    minimumLicenseRequired: 'basic',
    isExportable: true,
    executor: async ({ params: ruleParams, services, spaceId }) => {
      const config = await firstValueFrom(config$);

      const { getAlertUuid, savedObjectsClient, scopedClusterClient } =
        services;

      const indices = await getApmIndices({
        config,
        savedObjectsClient,
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
          track_total_hits: false,
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
                ...termQuery(SERVICE_NAME, ruleParams.serviceName, {
                  queryEmptyString: false,
                }),
                ...termQuery(TRANSACTION_TYPE, ruleParams.transactionType, {
                  queryEmptyString: false,
                }),
                ...environmentQuery(ruleParams.environment),
              ] as QueryDslQueryContainer[],
            },
          },
          aggs: {
            series: {
              multi_terms: {
                terms: [
                  { field: SERVICE_NAME },
                  {
                    field: SERVICE_ENVIRONMENT,
                    missing: ENVIRONMENT_NOT_DEFINED.value,
                  },
                  { field: TRANSACTION_TYPE },
                ],
                size: 1000,
                ...getMultiTermsSortOrder(ruleParams.aggregationType),
              },
              aggs: {
                ...averageOrPercentileAgg({
                  aggregationType: ruleParams.aggregationType,
                  transactionDurationField: field,
                }),
                ...getServiceGroupFieldsAgg(),
              },
            },
          },
        },
      };

      const response = await alertingEsClient({
        scopedClusterClient,
        params: searchParams,
      });

      if (!response.aggregations) {
        return { state: {} };
      }

      // Converts threshold to microseconds because this is the unit used on transactionDuration
      const thresholdMicroseconds = ruleParams.threshold * 1000;

      const triggeredBuckets = [];

      for (const bucket of response.aggregations.series.buckets) {
        const [serviceName, environment, transactionType] = bucket.key;

        const transactionDuration =
          'avgLatency' in bucket // only true if ruleParams.aggregationType === 'avg'
            ? bucket.avgLatency.value
            : bucket.pctLatency.values[0].value;

        if (
          transactionDuration !== null &&
          transactionDuration > thresholdMicroseconds
        ) {
          triggeredBuckets.push({
            environment,
            serviceName,
            sourceFields: getServiceGroupFields(bucket),
            transactionType,
            transactionDuration,
          });
        }
      }

      for (const {
        serviceName,
        environment,
        transactionType,
        transactionDuration,
        sourceFields,
      } of triggeredBuckets) {
        const environmentLabel = getEnvironmentLabel(environment);

        const durationFormatter = getDurationFormatter(transactionDuration);
        const transactionDurationFormatted =
          durationFormatter(transactionDuration).formatted;

        const reason = formatTransactionDurationReason({
          aggregationType: String(ruleParams.aggregationType),
          asDuration,
          measured: transactionDuration,
          serviceName,
          threshold: thresholdMicroseconds,
          windowSize: ruleParams.windowSize,
          windowUnit: ruleParams.windowUnit,
        });

        const id = `${ApmRuleType.TransactionDuration}_${environmentLabel}`;

        const alertUuid = getAlertUuid(id);

        const alertDetailsUrl = getAlertDetailsUrl(
          basePath,
          spaceId,
          alertUuid
        );

        const viewInAppUrl = addSpaceIdToPath(
          basePath.publicBaseUrl,
          spaceId,
          getAlertUrlTransaction(
            serviceName,
            getEnvironmentEsField(environment)?.[SERVICE_ENVIRONMENT],
            transactionType
          )
        );

        services
          .alertWithLifecycle({
            id,
            fields: {
              [SERVICE_NAME]: serviceName,
              ...getEnvironmentEsField(environment),
              [TRANSACTION_TYPE]: transactionType,
              [PROCESSOR_EVENT]: ProcessorEvent.transaction,
              [ALERT_EVALUATION_VALUE]: transactionDuration,
              [ALERT_EVALUATION_THRESHOLD]: thresholdMicroseconds,
              [ALERT_REASON]: reason,
              ...sourceFields,
            },
          })
          .scheduleActions(ruleTypeConfig.defaultActionGroupId, {
            alertDetailsUrl,
            environment: environmentLabel,
            interval: `${ruleParams.windowSize}${ruleParams.windowUnit}`,
            reason,
            serviceName,
            threshold: thresholdMicroseconds,
            transactionType,
            triggerValue: transactionDurationFormatted,
            viewInAppUrl,
          });
      }

      return { state: {} };
    },
  });

  alerting.registerType(ruleType);
}
