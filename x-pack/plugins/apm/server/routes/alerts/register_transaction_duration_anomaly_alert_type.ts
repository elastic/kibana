/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { compact } from 'lodash';
import { ESSearchResponse } from 'src/core/types/elasticsearch';
import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import {
  ALERT_EVALUATION_THRESHOLD,
  ALERT_EVALUATION_VALUE,
  ALERT_SEVERITY,
  ALERT_REASON,
} from '@kbn/rule-data-utils';
import { join } from 'path';
import { createLifecycleRuleTypeFactory } from '../../../../rule_registry/server';
import { ProcessorEvent } from '../../../common/processor_event';
import { getSeverity } from '../../../common/anomaly_detection';
import {
  PROCESSOR_EVENT,
  SERVICE_NAME,
  TRANSACTION_TYPE,
  SERVICE_ENVIRONMENT,
} from '../../../common/elasticsearch_fieldnames';
import { getAlertUrlTransactionDurationAnomaly } from '../../../common/utils/formatters';
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
import { termQuery } from '../../../../observability/server';

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
  basePath,
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
                        gte: `now-${ruleParams.windowSize}${ruleParams.windowUnit}`,
                        format: 'epoch_millis',
                      },
                    },
                  },
                  ...termQuery('partition_field_value', ruleParams.serviceName),
                  ...termQuery('by_field_value', ruleParams.transactionType),
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
          const reasonMessage = formatTransactionDurationAnomalyReason({
            measured: score,
            serviceName,
            severityLevel,
            windowSize: params.windowSize,
            windowUnit: params.windowUnit,
          });

          // The function args wrapped with arrays because this function is shared with the frontend and the vars there are parsed by parseTechnicalFields()
          const relativeViewInAppUrl = getAlertUrlTransactionDurationAnomaly(
            [serviceName],
            [getEnvironmentEsField(environment)?.[SERVICE_ENVIRONMENT]],
            [transactionType]
          );

          const viewInAppUrl = basePath.publicBaseUrl
            ? new URL(
                join(basePath.serverBasePath, relativeViewInAppUrl),
                basePath.publicBaseUrl
              ).toString()
            : relativeViewInAppUrl;
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
