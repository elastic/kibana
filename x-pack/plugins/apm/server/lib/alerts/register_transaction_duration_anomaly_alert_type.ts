/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { compact } from 'lodash';
import { ESSearchResponse } from 'src/core/types/elasticsearch';
import { QueryDslQueryContainer } from '@elastic/elasticsearch/api/types';
import type {
  ALERT_EVALUATION_THRESHOLD as ALERT_EVALUATION_THRESHOLD_TYPED,
  ALERT_EVALUATION_VALUE as ALERT_EVALUATION_VALUE_TYPED,
  ALERT_SEVERITY as ALERT_SEVERITY_TYPED,
  ALERT_REASON as ALERT_REASON_TYPED,
} from '@kbn/rule-data-utils';
import {
  ALERT_EVALUATION_THRESHOLD as ALERT_EVALUATION_THRESHOLD_NON_TYPED,
  ALERT_EVALUATION_VALUE as ALERT_EVALUATION_VALUE_NON_TYPED,
  ALERT_SEVERITY as ALERT_SEVERITY_NON_TYPED,
  ALERT_REASON as ALERT_REASON_NON_TYPED,
  // @ts-expect-error
} from '@kbn/rule-data-utils/target_node/technical_field_names';
import { createLifecycleRuleTypeFactory } from '../../../../rule_registry/server';
import { ProcessorEvent } from '../../../common/processor_event';
import { getSeverity } from '../../../common/anomaly_detection';
import {
  PROCESSOR_EVENT,
  SERVICE_NAME,
  TRANSACTION_TYPE,
} from '../../../common/elasticsearch_fieldnames';
import { asMutableArray } from '../../../common/utils/as_mutable_array';
import { ANOMALY_SEVERITY } from '../../../common/ml_constants';
import { KibanaRequest } from '../../../../../../src/core/server';
import {
  AlertType,
  ALERT_TYPES_CONFIG,
  ANOMALY_ALERT_SEVERITY_TYPES,
  formatTransactionDurationAnomalyReason,
} from '../../../common/alert_types';
import { getMLJobs } from '../service_map/get_service_anomalies';
import { apmActionVariables } from './action_variables';
import { RegisterRuleDependencies } from './register_apm_alerts';
import {
  getEnvironmentEsField,
  getEnvironmentLabel,
} from '../../../common/environment_filter_values';

const ALERT_EVALUATION_THRESHOLD: typeof ALERT_EVALUATION_THRESHOLD_TYPED =
  ALERT_EVALUATION_THRESHOLD_NON_TYPED;
const ALERT_EVALUATION_VALUE: typeof ALERT_EVALUATION_VALUE_TYPED =
  ALERT_EVALUATION_VALUE_NON_TYPED;
const ALERT_SEVERITY: typeof ALERT_SEVERITY_TYPED = ALERT_SEVERITY_NON_TYPED;
const ALERT_REASON: typeof ALERT_REASON_TYPED = ALERT_REASON_NON_TYPED;

const paramsSchema = schema.object({
  serviceName: schema.maybe(schema.string()),
  transactionType: schema.maybe(schema.string()),
  windowSize: schema.number(),
  windowUnit: schema.string(),
  environment: schema.string(),
  anomalySeverityType: schema.oneOf([
    schema.literal(ANOMALY_SEVERITY.CRITICAL),
    schema.literal(ANOMALY_SEVERITY.MAJOR),
    schema.literal(ANOMALY_SEVERITY.MINOR),
    schema.literal(ANOMALY_SEVERITY.WARNING),
  ]),
});

const alertTypeConfig =
  ALERT_TYPES_CONFIG[AlertType.TransactionDurationAnomaly];

export function registerTransactionDurationAnomalyAlertType({
  logger,
  ruleDataClient,
  alerting,
  ml,
}: RegisterRuleDependencies) {
  const createLifecycleRuleType = createLifecycleRuleTypeFactory({
    logger,
    ruleDataClient,
  });

  alerting.registerType(
    createLifecycleRuleType({
      id: AlertType.TransactionDurationAnomaly,
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
        ],
      },
      producer: 'apm',
      minimumLicenseRequired: 'basic',
      isExportable: true,
      executor: async ({ services, params }) => {
        if (!ml) {
          return {};
        }
        const alertParams = params;
        const request = {} as KibanaRequest;
        const { mlAnomalySearch } = ml.mlSystemProvider(
          request,
          services.savedObjectsClient
        );
        const anomalyDetectors = ml.anomalyDetectorsProvider(
          request,
          services.savedObjectsClient
        );

        const mlJobs = await getMLJobs(
          anomalyDetectors,
          alertParams.environment
        );

        const selectedOption = ANOMALY_ALERT_SEVERITY_TYPES.find(
          (option) => option.type === alertParams.anomalySeverityType
        );

        if (!selectedOption) {
          throw new Error(
            `Anomaly alert severity type ${alertParams.anomalySeverityType} is not supported.`
          );
        }

        const threshold = selectedOption.threshold;

        if (mlJobs.length === 0) {
          return {};
        }

        const jobIds = mlJobs.map((job) => job.job_id);
        const anomalySearchParams = {
          body: {
            size: 0,
            query: {
              bool: {
                filter: [
                  { term: { result_type: 'record' } },
                  { terms: { job_id: jobIds } },
                  { term: { is_interim: false } },
                  {
                    range: {
                      timestamp: {
                        gte: `now-${alertParams.windowSize}${alertParams.windowUnit}`,
                        format: 'epoch_millis',
                      },
                    },
                  },
                  ...(alertParams.serviceName
                    ? [
                        {
                          term: {
                            partition_field_value: alertParams.serviceName,
                          },
                        },
                      ]
                    : []),
                  ...(alertParams.transactionType
                    ? [
                        {
                          term: {
                            by_field_value: alertParams.transactionType,
                          },
                        },
                      ]
                    : []),
                ] as QueryDslQueryContainer[],
              },
            },
            aggs: {
              anomaly_groups: {
                multi_terms: {
                  terms: [
                    { field: 'partition_field_value' },
                    { field: 'by_field_value' },
                    { field: 'job_id' },
                  ],
                  size: 10000,
                },
                aggs: {
                  latest_score: {
                    top_metrics: {
                      metrics: asMutableArray([
                        { field: 'record_score' },
                        { field: 'partition_field_value' },
                        { field: 'by_field_value' },
                        { field: 'job_id' },
                      ] as const),
                      sort: {
                        timestamp: 'desc' as const,
                      },
                    },
                  },
                },
              },
            },
          },
        };

        const response: ESSearchResponse<unknown, typeof anomalySearchParams> =
          (await mlAnomalySearch(anomalySearchParams, [])) as any;

        const anomalies =
          response.aggregations?.anomaly_groups.buckets
            .map((bucket) => {
              const latest = bucket.latest_score.top[0].metrics;

              const job = mlJobs.find((j) => j.job_id === latest.job_id);

              if (!job) {
                logger.warn(
                  `Could not find matching job for job id ${latest.job_id}`
                );
                return undefined;
              }

              return {
                serviceName: latest.partition_field_value as string,
                transactionType: latest.by_field_value as string,
                environment: job.custom_settings!.job_tags!.environment,
                score: latest.record_score as number,
              };
            })
            .filter((anomaly) =>
              anomaly ? anomaly.score >= threshold : false
            ) ?? [];

        compact(anomalies).forEach((anomaly) => {
          const { serviceName, environment, transactionType, score } = anomaly;
          const severityLevel = getSeverity(score);

          services
            .alertWithLifecycle({
              id: [
                AlertType.TransactionDurationAnomaly,
                serviceName,
                environment,
                transactionType,
              ]
                .filter((name) => name)
                .join('_'),
              fields: {
                [SERVICE_NAME]: serviceName,
                ...getEnvironmentEsField(environment),
                [TRANSACTION_TYPE]: transactionType,
                [PROCESSOR_EVENT]: ProcessorEvent.transaction,
                [ALERT_SEVERITY]: severityLevel,
                [ALERT_EVALUATION_VALUE]: score,
                [ALERT_EVALUATION_THRESHOLD]: threshold,
                [ALERT_REASON]: formatTransactionDurationAnomalyReason({
                  measured: score,
                  serviceName,
                  severityLevel,
                }),
              },
            })
            .scheduleActions(alertTypeConfig.defaultActionGroupId, {
              serviceName,
              transactionType,
              environment: getEnvironmentLabel(environment),
              threshold: selectedOption?.label,
              triggerValue: severityLevel,
            });
        });

        return {};
      },
    })
  );
}
