/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { Observable } from 'rxjs';
import { isEmpty } from 'lodash';
import { getSeverity } from '../../../common/anomaly_detection';
import { ANOMALY_SEVERITY } from '../../../../ml/common';
import { KibanaRequest } from '../../../../../../src/core/server';
import {
  AlertType,
  ALERT_TYPES_CONFIG,
  ANOMALY_ALERT_SEVERITY_TYPES,
} from '../../../common/alert_types';
import { AlertingPlugin } from '../../../../alerts/server';
import { APMConfig } from '../..';
import { MlPluginSetup } from '../../../../ml/server';
import { getMLJobs } from '../service_map/get_service_anomalies';
import { apmActionVariables } from './action_variables';

interface RegisterAlertParams {
  alerts: AlertingPlugin['setup'];
  ml?: MlPluginSetup;
  config$: Observable<APMConfig>;
}

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
  alerts,
  ml,
  config$,
}: RegisterAlertParams) {
  alerts.registerType({
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
    executor: async ({ services, params, state }) => {
      if (!ml) {
        return;
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

      const mlJobs = await getMLJobs(anomalyDetectors, alertParams.environment);

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
        terminateAfter: 1,
        body: {
          size: 0,
          query: {
            bool: {
              filter: [
                { term: { result_type: 'record' } },
                { terms: { job_id: jobIds } },
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
                {
                  range: {
                    record_score: {
                      gte: threshold,
                    },
                  },
                },
              ],
            },
          },
          aggs: {
            services: {
              terms: {
                field: 'partition_field_value',
                size: 50,
              },
              aggs: {
                transaction_types: {
                  terms: {
                    field: 'by_field_value',
                  },
                },
                record_avg: {
                  avg: {
                    field: 'record_score',
                  },
                },
              },
            },
          },
        },
      };

      const response = ((await mlAnomalySearch(
        anomalySearchParams,
        jobIds
      )) as unknown) as {
        hits: { total: { value: number } };
        aggregations?: {
          services: {
            buckets: Array<{
              key: string;
              record_avg: { value: number };
              transaction_types: { buckets: Array<{ key: string }> };
            }>;
          };
        };
      };

      const hitCount = response.hits.total.value;

      if (hitCount > 0) {
        function scheduleAction({
          serviceName,
          severity,
          environment,
          transactionType,
        }: {
          serviceName: string;
          severity: string;
          environment?: string;
          transactionType?: string;
        }) {
          const alertInstanceName = [
            AlertType.TransactionDurationAnomaly,
            serviceName,
            environment,
            transactionType,
          ]
            .filter((name) => name)
            .join('_');

          const alertInstance = services.alertInstanceFactory(
            alertInstanceName
          );

          alertInstance.scheduleActions(alertTypeConfig.defaultActionGroupId, {
            serviceName,
            environment,
            transactionType,
            threshold: selectedOption?.label,
            thresholdValue: severity,
          });
        }
        mlJobs.map((job) => {
          const environment = job.custom_settings?.job_tags?.environment;
          response.aggregations?.services.buckets.forEach((serviceBucket) => {
            const serviceName = serviceBucket.key as string;
            const severity = getSeverity(serviceBucket.record_avg.value);
            if (isEmpty(serviceBucket.transaction_types?.buckets)) {
              scheduleAction({ serviceName, severity, environment });
            } else {
              serviceBucket.transaction_types?.buckets.forEach((typeBucket) => {
                const transactionType = typeBucket.key as string;
                scheduleAction({
                  serviceName,
                  severity,
                  environment,
                  transactionType,
                });
              });
            }
          });
        });
      }
    },
  });
}
