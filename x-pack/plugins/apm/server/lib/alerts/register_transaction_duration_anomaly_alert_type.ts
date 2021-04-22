/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { compact } from 'lodash';
import { ESSearchResponse } from 'typings/elasticsearch';
import { QueryContainer } from '@elastic/elasticsearch/api/types';
import { ProcessorEvent } from '../../../common/processor_event';
import { getSeverity } from '../../../common/anomaly_detection';
import {
  PROCESSOR_EVENT,
  SERVICE_ENVIRONMENT,
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
} from '../../../common/alert_types';
import { getMLJobs } from '../service_map/get_service_anomalies';
import { apmActionVariables } from './action_variables';
import { RegisterRuleDependencies } from './register_apm_alerts';
import { parseEnvironmentUrlParam } from '../../../common/environment_filter_values';
import { createAPMLifecycleRuleType } from './create_apm_lifecycle_rule_type';

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
  registry,
  ml,
}: RegisterRuleDependencies) {
  registry.registerType(
    createAPMLifecycleRuleType({
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
                ] as QueryContainer[],
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

        const response: ESSearchResponse<
          unknown,
          typeof anomalySearchParams
        > = (await mlAnomalySearch(anomalySearchParams, [])) as any;

        const anomalies =
          response.aggregations?.anomaly_groups.buckets
            .map((bucket) => {
              const latest = bucket.latest_score.top[0].metrics;

              const job = mlJobs.find((j) => j.job_id === latest.job_id);

              if (!job) {
                services.logger.warn(
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

          const parsedEnvironment = parseEnvironmentUrlParam(environment);

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
                ...(parsedEnvironment.esFieldValue
                  ? { [SERVICE_ENVIRONMENT]: environment }
                  : {}),
                [TRANSACTION_TYPE]: transactionType,
                [PROCESSOR_EVENT]: ProcessorEvent.transaction,
                'kibana.rac.alert.severity.level': severityLevel,
                'kibana.rac.alert.severity.value': score,
                'kibana.observability.evaluation.value': score,
                'kibana.observability.evaluation.threshold': threshold,
              },
            })
            .scheduleActions(alertTypeConfig.defaultActionGroupId, {
              serviceName,
              transactionType,
              environment,
              threshold: selectedOption?.label,
              triggerValue: severityLevel,
            });
        });

        return {};
      },
    })
  );
}
