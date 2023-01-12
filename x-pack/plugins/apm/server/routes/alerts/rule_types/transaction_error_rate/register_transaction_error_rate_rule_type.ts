/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { firstValueFrom } from 'rxjs';
import {
  ALERT_EVALUATION_THRESHOLD,
  ALERT_EVALUATION_VALUE,
  ALERT_REASON,
} from '@kbn/rule-data-utils';
import { createLifecycleRuleTypeFactory } from '@kbn/rule-registry-plugin/server';
import { asPercent } from '@kbn/observability-plugin/common/utils/formatters';
import { termQuery } from '@kbn/observability-plugin/server';
import { addSpaceIdToPath } from '@kbn/spaces-plugin/common';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import { getAlertDetailsUrl } from '@kbn/infra-plugin/server/lib/alerting/common/utils';
import {
  ENVIRONMENT_NOT_DEFINED,
  getEnvironmentEsField,
  getEnvironmentLabel,
} from '../../../../../common/environment_filter_values';
import { getAlertUrlTransaction } from '../../../../../common/utils/formatters';
import {
  ApmRuleType,
  RULE_TYPES_CONFIG,
  APM_SERVER_FEATURE_ID,
  formatTransactionErrorRateReason,
} from '../../../../../common/rules/apm_rule_types';
import {
  EVENT_OUTCOME,
  PROCESSOR_EVENT,
  SERVICE_ENVIRONMENT,
  SERVICE_NAME,
  TRANSACTION_TYPE,
} from '../../../../../common/es_fields/apm';
import { EventOutcome } from '../../../../../common/event_outcome';
import { asDecimalOrInteger } from '../../../../../common/utils/formatters';
import { environmentQuery } from '../../../../../common/utils/environment_query';
import { getApmIndices } from '../../../settings/apm_indices/get_apm_indices';
import { apmActionVariables } from '../../action_variables';
import { alertingEsClient } from '../../alerting_es_client';
import { RegisterRuleDependencies } from '../../register_apm_rule_types';
import { SearchAggregatedTransactionSetting } from '../../../../../common/aggregated_transactions';
import { getDocumentTypeFilterForTransactions } from '../../../../lib/helpers/transactions';
import {
  getServiceGroupFields,
  getServiceGroupFieldsAgg,
} from '../get_service_group_fields';

const paramsSchema = schema.object({
  windowSize: schema.number(),
  windowUnit: schema.string(),
  threshold: schema.number(),
  transactionType: schema.maybe(schema.string()),
  serviceName: schema.maybe(schema.string()),
  environment: schema.string(),
});

const ruleTypeConfig = RULE_TYPES_CONFIG[ApmRuleType.TransactionErrorRate];

export function registerTransactionErrorRateRuleType({
  alerting,
  basePath,
  config$,
  logger,
  observability,
  ruleDataClient,
}: RegisterRuleDependencies) {
  const createLifecycleRuleType = createLifecycleRuleTypeFactory({
    ruleDataClient,
    logger,
  });

  alerting.registerType(
    createLifecycleRuleType({
      id: ApmRuleType.TransactionErrorRate,
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
          apmActionVariables.threshold,
          apmActionVariables.transactionType,
          apmActionVariables.triggerValue,
          apmActionVariables.viewInAppUrl,
        ],
      },
      producer: APM_SERVER_FEATURE_ID,
      minimumLicenseRequired: 'basic',
      isExportable: true,
      executor: async ({ services, spaceId, params: ruleParams }) => {
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
                  {
                    terms: {
                      [EVENT_OUTCOME]: [
                        EventOutcome.failure,
                        EventOutcome.success,
                      ],
                    },
                  },
                  ...termQuery(SERVICE_NAME, ruleParams.serviceName, {
                    queryEmptyString: false,
                  }),
                  ...termQuery(TRANSACTION_TYPE, ruleParams.transactionType, {
                    queryEmptyString: false,
                  }),
                  ...environmentQuery(ruleParams.environment),
                ],
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
                  order: { _count: 'desc' as const },
                },
                aggs: {
                  outcomes: {
                    terms: {
                      field: EVENT_OUTCOME,
                    },
                    aggs: getServiceGroupFieldsAgg(),
                  },
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

        const results = [];
        for (const bucket of response.aggregations.series.buckets) {
          const [serviceName, environment, transactionType] = bucket.key;

          const failedOutcomeBucket = bucket.outcomes.buckets.find(
            (outcomeBucket) => outcomeBucket.key === EventOutcome.failure
          );
          const failed = failedOutcomeBucket?.doc_count ?? 0;
          const succesful =
            bucket.outcomes.buckets.find(
              (outcomeBucket) => outcomeBucket.key === EventOutcome.success
            )?.doc_count ?? 0;
          const errorRate = (failed / (failed + succesful)) * 100;

          if (errorRate >= ruleParams.threshold) {
            results.push({
              serviceName,
              environment,
              transactionType,
              errorRate,
              sourceFields: getServiceGroupFields(failedOutcomeBucket),
            });
          }
        }

        results.forEach((result) => {
          const {
            serviceName,
            environment,
            transactionType,
            errorRate,
            sourceFields,
          } = result;

          const reasonMessage = formatTransactionErrorRateReason({
            threshold: ruleParams.threshold,
            measured: errorRate,
            asPercent,
            serviceName,
            windowSize: ruleParams.windowSize,
            windowUnit: ruleParams.windowUnit,
          });

          const id = [
            ApmRuleType.TransactionErrorRate,
            serviceName,
            transactionType,
            environment,
          ]
            .filter((name) => name)
            .join('_');

          const alertUuid = getAlertUuid(id);

          const alertDetailsUrl = getAlertDetailsUrl(
            basePath,
            spaceId,
            alertUuid
          );

          const relativeViewInAppUrl = getAlertUrlTransaction(
            serviceName,
            getEnvironmentEsField(environment)?.[SERVICE_ENVIRONMENT],
            transactionType
          );

          const viewInAppUrl = addSpaceIdToPath(
            basePath.publicBaseUrl,
            spaceId,
            relativeViewInAppUrl
          );

          services
            .alertWithLifecycle({
              id,
              fields: {
                [SERVICE_NAME]: serviceName,
                ...getEnvironmentEsField(environment),
                [TRANSACTION_TYPE]: transactionType,
                [PROCESSOR_EVENT]: ProcessorEvent.transaction,
                [ALERT_EVALUATION_VALUE]: errorRate,
                [ALERT_EVALUATION_THRESHOLD]: ruleParams.threshold,
                [ALERT_REASON]: reasonMessage,
                ...sourceFields,
              },
            })
            .scheduleActions(ruleTypeConfig.defaultActionGroupId, {
              alertDetailsUrl,
              environment: getEnvironmentLabel(environment),
              interval: `${ruleParams.windowSize}${ruleParams.windowUnit}`,
              reason: reasonMessage,
              serviceName,
              threshold: ruleParams.threshold,
              transactionType,
              triggerValue: asDecimalOrInteger(errorRate),
              viewInAppUrl,
            });
        });

        return { state: {} };
      },
    })
  );
}
