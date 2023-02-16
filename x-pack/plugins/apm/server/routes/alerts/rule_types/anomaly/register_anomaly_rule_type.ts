/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { KibanaRequest } from '@kbn/core/server';
import datemath from '@kbn/datemath';
import type { ESSearchResponse } from '@kbn/es-types';
import { getAlertDetailsUrl } from '@kbn/infra-plugin/server/lib/alerting/common/utils';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import { termQuery } from '@kbn/observability-plugin/server';
import {
  ALERT_EVALUATION_THRESHOLD,
  ALERT_EVALUATION_VALUE,
  ALERT_REASON,
  ALERT_SEVERITY,
} from '@kbn/rule-data-utils';
import { createLifecycleRuleTypeFactory } from '@kbn/rule-registry-plugin/server';
import { addSpaceIdToPath } from '@kbn/spaces-plugin/common';
import { compact } from 'lodash';
import { getSeverity } from '../../../../../common/anomaly_detection';
import {
  ApmMlDetectorType,
  getApmMlDetectorIndex,
} from '../../../../../common/anomaly_detection/apm_ml_detectors';
import {
  PROCESSOR_EVENT,
  SERVICE_ENVIRONMENT,
  SERVICE_NAME,
  TRANSACTION_TYPE,
} from '../../../../../common/es_fields/apm';
import {
  getEnvironmentEsField,
  getEnvironmentLabel,
} from '../../../../../common/environment_filter_values';
import {
  ANOMALY_ALERT_SEVERITY_TYPES,
  ApmRuleType,
  formatAnomalyReason,
  RULE_TYPES_CONFIG,
} from '../../../../../common/rules/apm_rule_types';
import { asMutableArray } from '../../../../../common/utils/as_mutable_array';
import { getAlertUrlTransaction } from '../../../../../common/utils/formatters';
import { getMLJobs } from '../../../service_map/get_service_anomalies';
import { apmActionVariables } from '../../action_variables';
import { RegisterRuleDependencies } from '../../register_apm_rule_types';
import { getServiceGroupFieldsForAnomaly } from './get_service_group_fields_for_anomaly';
import { anomalyParamsSchema } from '../../../../../common/rules/schema';

const ruleTypeConfig = RULE_TYPES_CONFIG[ApmRuleType.Anomaly];

export function registerAnomalyRuleType({
  alerting,
  basePath,
  config$,
  logger,
  ml,
  observability,
  ruleDataClient,
}: RegisterRuleDependencies) {
  const createLifecycleRuleType = createLifecycleRuleTypeFactory({
    logger,
    ruleDataClient,
  });

  alerting.registerType(
    createLifecycleRuleType({
      id: ApmRuleType.Anomaly,
      name: ruleTypeConfig.name,
      actionGroups: ruleTypeConfig.actionGroups,
      defaultActionGroupId: ruleTypeConfig.defaultActionGroupId,
      validate: { params: anomalyParamsSchema },
      actionVariables: {
        context: [
          ...(observability.getAlertDetailsConfig()?.apm.enabled
            ? [apmActionVariables.alertDetailsUrl]
            : []),
          apmActionVariables.environment,
          apmActionVariables.reason,
          apmActionVariables.serviceName,
          apmActionVariables.threshold,
          apmActionVariables.transactionType,
          apmActionVariables.triggerValue,
          apmActionVariables.viewInAppUrl,
        ],
      },
      producer: 'apm',
      minimumLicenseRequired: 'basic',
      isExportable: true,
      executor: async ({ params, services, spaceId }) => {
        if (!ml) {
          return { state: {} };
        }

        const { savedObjectsClient, scopedClusterClient, getAlertUuid } =
          services;

        const ruleParams = params;
        const request = {} as KibanaRequest;
        const { mlAnomalySearch } = ml.mlSystemProvider(
          request,
          savedObjectsClient
        );
        const anomalyDetectors = ml.anomalyDetectorsProvider(
          request,
          savedObjectsClient
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
          return { state: {} };
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
            track_total_hits: false,
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
                  ...termQuery(
                    'partition_field_value',
                    ruleParams.serviceName,
                    { queryEmptyString: false }
                  ),
                  ...termQuery('by_field_value', ruleParams.transactionType, {
                    queryEmptyString: false,
                  }),
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
                  size: 1000,
                  order: { 'latest_score.record_score': 'desc' as const },
                },
                aggs: {
                  latest_score: {
                    top_metrics: {
                      metrics: asMutableArray([
                        { field: 'record_score' },
                        { field: 'partition_field_value' },
                        { field: 'by_field_value' },
                        { field: 'job_id' },
                        { field: 'timestamp' },
                        { field: 'bucket_span' },
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
                timestamp: Date.parse(latest.timestamp as string),
                bucketSpan: latest.bucket_span as number,
              };
            })
            .filter((anomaly) =>
              anomaly ? anomaly.score >= threshold : false
            ) ?? [];

        for (const anomaly of compact(anomalies)) {
          const {
            serviceName,
            environment,
            transactionType,
            score,
            timestamp,
            bucketSpan,
          } = anomaly;

          const eventSourceFields = await getServiceGroupFieldsForAnomaly({
            config$,
            scopedClusterClient,
            savedObjectsClient,
            serviceName,
            environment,
            transactionType,
            timestamp,
            bucketSpan,
          });

          const severityLevel = getSeverity(score);
          const reasonMessage = formatAnomalyReason({
            measured: score,
            serviceName,
            severityLevel,
            windowSize: params.windowSize,
            windowUnit: params.windowUnit,
          });

          const id = [
            ApmRuleType.Anomaly,
            serviceName,
            environment,
            transactionType,
          ]
            .filter((name) => name)
            .join('_');

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

          const alertUuid = getAlertUuid(id);

          const alertDetailsUrl = getAlertDetailsUrl(
            basePath,
            spaceId,
            alertUuid
          );

          services
            .alertWithLifecycle({
              id,
              fields: {
                [SERVICE_NAME]: serviceName,
                ...getEnvironmentEsField(environment),
                [TRANSACTION_TYPE]: transactionType,
                [PROCESSOR_EVENT]: ProcessorEvent.transaction,
                [ALERT_SEVERITY]: severityLevel,
                [ALERT_EVALUATION_VALUE]: score,
                [ALERT_EVALUATION_THRESHOLD]: threshold,
                [ALERT_REASON]: reasonMessage,
                ...eventSourceFields,
              },
            })
            .scheduleActions(ruleTypeConfig.defaultActionGroupId, {
              alertDetailsUrl,
              environment: getEnvironmentLabel(environment),
              reason: reasonMessage,
              serviceName,
              threshold: selectedOption?.label,
              transactionType,
              triggerValue: severityLevel,
              viewInAppUrl,
            });
        }

        return { state: {} };
      },
    })
  );
}
