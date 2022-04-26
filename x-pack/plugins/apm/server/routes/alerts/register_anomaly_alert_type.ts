/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import datemath from '@kbn/datemath';
import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { schema } from '@kbn/config-schema';
import {
  ALERT_EVALUATION_THRESHOLD,
  ALERT_EVALUATION_VALUE,
  ALERT_REASON,
  ALERT_SEVERITY,
} from '@kbn/rule-data-utils';
import { compact } from 'lodash';
import { ESSearchResponse } from '@kbn/core/types/elasticsearch';
import { KibanaRequest } from '@kbn/core/server';
import { termQuery } from '@kbn/observability-plugin/server';
import { createLifecycleRuleTypeFactory } from '@kbn/rule-registry-plugin/server';
import {
  AlertType,
  ALERT_TYPES_CONFIG,
  ANOMALY_ALERT_SEVERITY_TYPES,
  formatAnomalyReason,
} from '../../../common/alert_types';
import { getSeverity } from '../../../common/anomaly_detection';
import {
  ApmMlDetectorType,
  getApmMlDetectorIndex,
} from '../../../common/anomaly_detection/apm_ml_detectors';
import {
  PROCESSOR_EVENT,
  SERVICE_ENVIRONMENT,
  SERVICE_NAME,
  TRANSACTION_TYPE,
} from '../../../common/elasticsearch_fieldnames';
import {
  getEnvironmentEsField,
  getEnvironmentLabel,
} from '../../../common/environment_filter_values';
import { ANOMALY_SEVERITY } from '../../../common/ml_constants';
import { ProcessorEvent } from '../../../common/processor_event';
import { asMutableArray } from '../../../common/utils/as_mutable_array';
import { getAlertUrlTransaction } from '../../../common/utils/formatters';
import { getMLJobs } from '../service_map/get_service_anomalies';
import { apmActionVariables } from './action_variables';
import { RegisterRuleDependencies } from './register_apm_alerts';

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

const alertTypeConfig = ALERT_TYPES_CONFIG[AlertType.Anomaly];

export function registerAnomalyAlertType({
  logger,
  ruleDataClient,
  alerting,
  ml,
  basePath,
}: RegisterRuleDependencies) {
  const createLifecycleRuleType = createLifecycleRuleTypeFactory({
    logger,
    ruleDataClient,
  });

  alerting.registerType(
    createLifecycleRuleType({
      id: AlertType.Anomaly,
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
          apmActionVariables.reason,
          apmActionVariables.viewInAppUrl,
        ],
      },
      producer: 'apm',
      minimumLicenseRequired: 'basic',
      isExportable: true,
      executor: async ({ services, params }) => {
        if (!ml) {
          return {};
        }
        const ruleParams = params;
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
          ruleParams.environment
        );

        const selectedOption = ANOMALY_ALERT_SEVERITY_TYPES.find(
          (option) => option.type === ruleParams.anomalySeverityType
        );

        if (!selectedOption) {
          throw new Error(
            `Anomaly alert severity type ${ruleParams.anomalySeverityType} is not supported.`
          );
        }

        const threshold = selectedOption.threshold;

        if (mlJobs.length === 0) {
          return {};
        }

        // start time must be at least 30, does like this to support rules created before this change where default was 15
        const startTime = Math.min(
          datemath.parse('now-30m')!.valueOf(),
          datemath
            .parse(`now-${ruleParams.windowSize}${ruleParams.windowUnit}`)
            ?.valueOf() || 0
        );

        const jobIds = mlJobs.map((job) => job.jobId);
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
                        gte: startTime,
                        format: 'epoch_millis',
                      },
                    },
                  },
                  ...termQuery('partition_field_value', ruleParams.serviceName),
                  ...termQuery('by_field_value', ruleParams.transactionType),
                  ...termQuery(
                    'detector_index',
                    getApmMlDetectorIndex(ApmMlDetectorType.txLatency)
                  ),
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

              const job = mlJobs.find((j) => j.jobId === latest.job_id);

              if (!job) {
                logger.warn(
                  `Could not find matching job for job id ${latest.job_id}`
                );
                return undefined;
              }

              return {
                serviceName: latest.partition_field_value as string,
                transactionType: latest.by_field_value as string,
                environment: job.environment,
                score: latest.record_score as number,
              };
            })
            .filter((anomaly) =>
              anomaly ? anomaly.score >= threshold : false
            ) ?? [];

        compact(anomalies).forEach((anomaly) => {
          const { serviceName, environment, transactionType, score } = anomaly;
          const severityLevel = getSeverity(score);
          const reasonMessage = formatAnomalyReason({
            measured: score,
            serviceName,
            severityLevel,
            windowSize: params.windowSize,
            windowUnit: params.windowUnit,
          });

          const relativeViewInAppUrl = getAlertUrlTransaction(
            serviceName,
            getEnvironmentEsField(environment)?.[SERVICE_ENVIRONMENT],
            transactionType
          );

          const viewInAppUrl = basePath.publicBaseUrl
            ? new URL(
                basePath.prepend(relativeViewInAppUrl),
                basePath.publicBaseUrl
              ).toString()
            : relativeViewInAppUrl;
          services
            .alertWithLifecycle({
              id: [AlertType.Anomaly, serviceName, environment, transactionType]
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
                [ALERT_REASON]: reasonMessage,
              },
            })
            .scheduleActions(alertTypeConfig.defaultActionGroupId, {
              serviceName,
              transactionType,
              environment: getEnvironmentLabel(environment),
              threshold: selectedOption?.label,
              triggerValue: severityLevel,
              reason: reasonMessage,
              viewInAppUrl,
            });
        });

        return {};
      },
    })
  );
}
