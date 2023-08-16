/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { GetViewInAppRelativeUrlFnOpts } from '@kbn/alerting-plugin/server';
import {
  asDuration,
  formatDurationFromTimeUnitChar,
  getAlertDetailsUrl,
  observabilityPaths,
  ProcessorEvent,
  TimeUnitChar,
} from '@kbn/observability-plugin/common';
import {
  getParsedFilterQuery,
  termQuery,
} from '@kbn/observability-plugin/server';
import {
  ALERT_EVALUATION_THRESHOLD,
  ALERT_EVALUATION_VALUE,
  ALERT_REASON,
} from '@kbn/rule-data-utils';
import { createLifecycleRuleTypeFactory } from '@kbn/rule-registry-plugin/server';
import { addSpaceIdToPath } from '@kbn/spaces-plugin/common';
import { firstValueFrom } from 'rxjs';
import { getGroupByTerms } from '../utils/get_groupby_terms';
import { SearchAggregatedTransactionSetting } from '../../../../../common/aggregated_transactions';
import { getEnvironmentEsField } from '../../../../../common/environment_filter_values';
import {
  PROCESSOR_EVENT,
  SERVICE_ENVIRONMENT,
  SERVICE_NAME,
  TRANSACTION_NAME,
  TRANSACTION_TYPE,
} from '../../../../../common/es_fields/apm';
import {
  ApmRuleType,
  APM_SERVER_FEATURE_ID,
  formatTransactionDurationReason,
  RULE_TYPES_CONFIG,
} from '../../../../../common/rules/apm_rule_types';
import { transactionDurationParamsSchema } from '../../../../../common/rules/schema';
import { environmentQuery } from '../../../../../common/utils/environment_query';
import {
  getAlertUrlTransaction,
  getDurationFormatter,
} from '../../../../../common/utils/formatters';
import {
  getDocumentTypeFilterForTransactions,
  getDurationFieldForTransactions,
} from '../../../../lib/helpers/transactions';
import { getApmIndices } from '../../../settings/apm_indices/get_apm_indices';
import { apmActionVariables } from '../../action_variables';
import { alertingEsClient } from '../../alerting_es_client';
import {
  ApmRuleTypeAlertDefinition,
  RegisterRuleDependencies,
} from '../../register_apm_rule_types';
import {
  getServiceGroupFields,
  getServiceGroupFieldsAgg,
} from '../get_service_group_fields';
import {
  averageOrPercentileAgg,
  getMultiTermsSortOrder,
} from './average_or_percentile_agg';
import { getGroupByActionVariables } from '../utils/get_groupby_action_variables';
import { getAllGroupByFields } from '../../../../../common/rules/get_all_groupby_fields';

const ruleTypeConfig = RULE_TYPES_CONFIG[ApmRuleType.TransactionDuration];

export function registerTransactionDurationRuleType({
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

  const ruleType = createLifecycleRuleType({
    id: ApmRuleType.TransactionDuration,
    name: ruleTypeConfig.name,
    actionGroups: ruleTypeConfig.actionGroups,
    defaultActionGroupId: ruleTypeConfig.defaultActionGroupId,
    validate: { params: transactionDurationParamsSchema },
    actionVariables: {
      context: [
        apmActionVariables.alertDetailsUrl,
        apmActionVariables.environment,
        apmActionVariables.interval,
        apmActionVariables.reason,
        apmActionVariables.serviceName,
        apmActionVariables.transactionType,
        apmActionVariables.transactionName,
        apmActionVariables.threshold,
        apmActionVariables.triggerValue,
        apmActionVariables.viewInAppUrl,
      ],
    },
    producer: APM_SERVER_FEATURE_ID,
    minimumLicenseRequired: 'basic',
    isExportable: true,
    executor: async ({ params: ruleParams, services, spaceId }) => {
      const allGroupByFields = getAllGroupByFields(
        ApmRuleType.TransactionDuration,
        ruleParams.groupBy
      );

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

      const termFilterQuery = !ruleParams.kqlFilter
        ? [
            ...termQuery(SERVICE_NAME, ruleParams.serviceName, {
              queryEmptyString: false,
            }),
            ...termQuery(TRANSACTION_TYPE, ruleParams.transactionType, {
              queryEmptyString: false,
            }),
            ...termQuery(TRANSACTION_NAME, ruleParams.transactionName, {
              queryEmptyString: false,
            }),
            ...environmentQuery(ruleParams.environment),
          ]
        : [];

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
                ...termFilterQuery,
                ...getParsedFilterQuery(ruleParams.kqlFilter),
              ] as QueryDslQueryContainer[],
            },
          },
          aggs: {
            series: {
              multi_terms: {
                terms: [...getGroupByTerms(allGroupByFields)],
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
        const groupByFields = bucket.key.reduce(
          (obj, bucketKey, bucketIndex) => {
            obj[allGroupByFields[bucketIndex]] = bucketKey;
            return obj;
          },
          {} as Record<string, string>
        );

        const bucketKey = bucket.key;

        const transactionDuration =
          'avgLatency' in bucket // only true if ruleParams.aggregationType === 'avg'
            ? bucket.avgLatency.value
            : bucket.pctLatency.values[0].value;

        if (
          transactionDuration !== null &&
          transactionDuration > thresholdMicroseconds
        ) {
          triggeredBuckets.push({
            sourceFields: getServiceGroupFields(bucket),
            transactionDuration,
            groupByFields,
            bucketKey,
          });
        }
      }

      for (const {
        transactionDuration,
        sourceFields,
        groupByFields,
        bucketKey,
      } of triggeredBuckets) {
        const durationFormatter = getDurationFormatter(transactionDuration);
        const transactionDurationFormatted =
          durationFormatter(transactionDuration).formatted;

        const reason = formatTransactionDurationReason({
          aggregationType: String(ruleParams.aggregationType),
          asDuration,
          measured: transactionDuration,
          threshold: thresholdMicroseconds,
          windowSize: ruleParams.windowSize,
          windowUnit: ruleParams.windowUnit,
          groupByFields,
        });

        const alertId = bucketKey.join('_');
        const alert = services.alertWithLifecycle({
          id: alertId,
          fields: {
            [TRANSACTION_NAME]: ruleParams.transactionName,
            [PROCESSOR_EVENT]: ProcessorEvent.transaction,
            [ALERT_EVALUATION_VALUE]: transactionDuration,
            [ALERT_EVALUATION_THRESHOLD]: thresholdMicroseconds,
            [ALERT_REASON]: reason,
            ...sourceFields,
            ...groupByFields,
          },
        });

        const alertUuid = getAlertUuid(alertId);
        const alertDetailsUrl = getAlertDetailsUrl(
          basePath,
          spaceId,
          alertUuid
        );
        const viewInAppUrl = addSpaceIdToPath(
          basePath.publicBaseUrl,
          spaceId,
          getAlertUrlTransaction(
            groupByFields[SERVICE_NAME],
            getEnvironmentEsField(groupByFields[SERVICE_ENVIRONMENT])?.[
              SERVICE_ENVIRONMENT
            ],
            groupByFields[TRANSACTION_TYPE]
          )
        );
        const groupByActionVariables = getGroupByActionVariables(groupByFields);
        alert.scheduleActions(ruleTypeConfig.defaultActionGroupId, {
          alertDetailsUrl,
          interval: formatDurationFromTimeUnitChar(
            ruleParams.windowSize,
            ruleParams.windowUnit as TimeUnitChar
          ),
          reason,
          // When group by doesn't include transaction.name, the context.transaction.name action variable will contain value of the Transaction Name filter
          transactionName: ruleParams.transactionName,
          threshold: ruleParams.threshold,
          triggerValue: transactionDurationFormatted,
          viewInAppUrl,
          ...groupByActionVariables,
        });
      }

      return { state: {} };
    },
    alerts: ApmRuleTypeAlertDefinition,
    getViewInAppRelativeUrl: ({ rule }: GetViewInAppRelativeUrlFnOpts<{}>) =>
      observabilityPaths.ruleDetails(rule.id),
  });

  alerting.registerType(ruleType);
}
