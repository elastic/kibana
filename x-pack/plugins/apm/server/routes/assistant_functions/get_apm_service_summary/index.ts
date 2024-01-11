/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import datemath from '@elastic/datemath';
import { ElasticsearchClient, Logger } from '@kbn/core/server';
import {
  rangeQuery,
  ScopedAnnotationsClient,
} from '@kbn/observability-plugin/server';
import {
  ALERT_RULE_PRODUCER,
  ALERT_STATUS,
  ALERT_STATUS_ACTIVE,
} from '@kbn/rule-registry-plugin/common/technical_rule_data_field_names';
import * as t from 'io-ts';
import { compact, keyBy } from 'lodash';
import {
  AnomalyDetectorType,
  getAnomalyDetectorType,
} from '../../../../common/anomaly_detection/apm_ml_detectors';
import { ENVIRONMENT_ALL } from '../../../../common/environment_filter_values';
import { Environment } from '../../../../common/environment_rt';
import { SERVICE_NAME } from '../../../../common/es_fields/apm';
import { asMutableArray } from '../../../../common/utils/as_mutable_array';
import { environmentQuery } from '../../../../common/utils/environment_query';
import { maybe } from '../../../../common/utils/maybe';
import { termQuery } from '../../../../common/utils/term_query';
import { anomalySearch } from '../../../lib/anomaly_detection/anomaly_search';
import { apmMlAnomalyQuery } from '../../../lib/anomaly_detection/apm_ml_anomaly_query';
import { apmMlJobsQuery } from '../../../lib/anomaly_detection/apm_ml_jobs_query';
import { getMlJobsWithAPMGroup } from '../../../lib/anomaly_detection/get_ml_jobs_with_apm_group';
import { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';
import { ApmAlertsClient } from '../../../lib/helpers/get_apm_alerts_client';
import { MlClient } from '../../../lib/helpers/get_ml_client';
import { getEnvironments } from '../../environments/get_environments';
import { getServiceAnnotations } from '../../services/annotations';
import { getServiceMetadataDetails } from '../../services/get_service_metadata_details';

export const serviceSummaryRouteRt = t.intersection([
  t.type({
    'service.name': t.string,
    start: t.string,
    end: t.string,
  }),
  t.partial({
    'service.environment': t.string,
    'transaction.type': t.string,
  }),
]);

async function getAnomalies({
  serviceName,
  transactionType,
  environment,
  start,
  end,
  mlClient,
  logger,
}: {
  serviceName: string;
  transactionType?: string;
  environment?: string;
  start: number;
  end: number;
  mlClient?: MlClient;
  logger: Logger;
}) {
  if (!mlClient) {
    return [];
  }

  const mlJobs = (
    await getMlJobsWithAPMGroup(mlClient.anomalyDetectors)
  ).filter((job) => job.environment !== environment);

  if (!mlJobs.length) {
    return [];
  }

  const anomaliesResponse = await anomalySearch(
    mlClient.mlSystem.mlAnomalySearch,
    {
      body: {
        size: 0,
        query: {
          bool: {
            filter: [
              ...apmMlAnomalyQuery({
                serviceName,
                transactionType,
              }),
              ...rangeQuery(start, end, 'timestamp'),
              ...apmMlJobsQuery(mlJobs),
            ],
          },
        },
        aggs: {
          by_timeseries_id: {
            composite: {
              size: 5000,
              sources: asMutableArray([
                {
                  jobId: {
                    terms: {
                      field: 'job_id',
                    },
                  },
                },
                {
                  detectorIndex: {
                    terms: {
                      field: 'detector_index',
                    },
                  },
                },
                {
                  serviceName: {
                    terms: {
                      field: 'partition_field_value',
                    },
                  },
                },
                {
                  transactionType: {
                    terms: {
                      field: 'by_field_value',
                    },
                  },
                },
              ] as const),
            },
            aggs: {
              record_scores: {
                filter: {
                  term: {
                    result_type: 'record',
                  },
                },
                aggs: {
                  top_anomaly: {
                    top_metrics: {
                      metrics: asMutableArray([
                        { field: 'record_score' },
                        { field: 'actual' },
                        { field: 'timestamp' },
                      ] as const),
                      size: 1,
                      sort: {
                        record_score: 'desc',
                      },
                    },
                  },
                },
              },
              model_lower: {
                min: {
                  field: 'model_lower',
                },
              },
              model_upper: {
                max: {
                  field: 'model_upper',
                },
              },
            },
          },
        },
      },
    }
  );

  const jobsById = keyBy(mlJobs, (job) => job.jobId);

  const anomalies =
    anomaliesResponse.aggregations?.by_timeseries_id.buckets.map((bucket) => {
      const jobId = bucket.key.jobId as string;
      const job = maybe(jobsById[jobId]);

      if (!job) {
        logger.warn(`Could not find job for id ${jobId}`);
        return undefined;
      }

      const type = getAnomalyDetectorType(Number(bucket.key.detectorIndex));

      // ml failure rate is stored as 0-100, we calculate failure rate as 0-1
      const divider = type === AnomalyDetectorType.txFailureRate ? 100 : 1;

      const metrics = bucket.record_scores.top_anomaly.top[0]?.metrics;

      if (!metrics) {
        return undefined;
      }

      return {
        '@timestamp': new Date(metrics.timestamp as number).toISOString(),
        metricName: type.replace('tx', 'transaction'),
        'service.name': bucket.key.serviceName as string,
        'service.environment': job.environment,
        'transaction.type': bucket.key.transactionType as string,
        anomalyScore: metrics.record_score,
        actualValue: Number(metrics.actual) / divider,
        expectedBoundsLower: Number(bucket.model_lower.value) / divider,
        expectedBoundsUpper: Number(bucket.model_upper.value) / divider,
      };
    });

  return compact(anomalies);
}

export interface ServiceSummary {
  'service.name': string;
  'service.environment': string[];
  'agent.name'?: string;
  'service.version'?: string[];
  'language.name'?: string;
  'service.framework'?: string;
  instances: number;
  anomalies: Array<{
    '@timestamp': string;
    metricName: string;
    'service.name': string;
    'service.environment': Environment;
    'transaction.type': string;
    anomalyScore: string | number | null;
    actualValue: number;
    expectedBoundsLower: number;
    expectedBoundsUpper: number;
  }>;
  alerts: Array<{ type?: string; started: string }>;
  deployments: Array<{ '@timestamp': string }>;
}

export async function getApmServiceSummary({
  arguments: args,
  apmEventClient,
  mlClient,
  esClient,
  annotationsClient,
  apmAlertsClient,
  logger,
}: {
  arguments: t.TypeOf<typeof serviceSummaryRouteRt>;
  apmEventClient: APMEventClient;
  mlClient?: MlClient;
  esClient: ElasticsearchClient;
  annotationsClient?: ScopedAnnotationsClient;
  apmAlertsClient: ApmAlertsClient;
  logger: Logger;
}): Promise<ServiceSummary> {
  const start = datemath.parse(args.start)?.valueOf()!;
  const end = datemath.parse(args.end)?.valueOf()!;

  const serviceName = args['service.name'];
  const environment = args['service.environment'] || ENVIRONMENT_ALL.value;
  const transactionType = args['transaction.type'];

  const [environments, metadataDetails, anomalies, annotations, alerts] =
    await Promise.all([
      environment === ENVIRONMENT_ALL.value
        ? getEnvironments({
            apmEventClient,
            start,
            end,
            size: 10,
            serviceName,
            searchAggregatedTransactions: true,
          })
        : Promise.resolve([environment]),
      getServiceMetadataDetails({
        apmEventClient,
        start,
        end,
        serviceName,
        environment,
      }),
      getAnomalies({
        serviceName,
        start,
        end,
        environment,
        mlClient,
        logger,
        transactionType,
      }),
      getServiceAnnotations({
        apmEventClient,
        start,
        end,
        searchAggregatedTransactions: true,
        client: esClient,
        annotationsClient,
        environment,
        logger,
        serviceName,
      }),
      apmAlertsClient.search({
        size: 100,
        track_total_hits: false,
        body: {
          query: {
            bool: {
              filter: [
                ...termQuery(ALERT_RULE_PRODUCER, 'apm'),
                ...termQuery(ALERT_STATUS, ALERT_STATUS_ACTIVE),
                ...rangeQuery(start, end),
                ...termQuery(SERVICE_NAME, serviceName),
                ...environmentQuery(environment),
              ],
            },
          },
        },
      }),
    ]);

  return {
    'service.name': serviceName,
    'service.environment': environments,
    'agent.name': metadataDetails.service?.agent.name,
    'service.version': metadataDetails.service?.versions,
    'language.name': metadataDetails.service?.agent.name,
    'service.framework': metadataDetails.service?.framework,
    instances: metadataDetails.container?.totalNumberInstances ?? 1,
    anomalies,
    alerts: alerts.hits.hits.map((alert) => ({
      type: alert._source?.['kibana.alert.rule.type'],
      started: new Date(alert._source?.['kibana.alert.start']!).toISOString(),
    })),
    deployments: annotations.annotations.map((annotation) => ({
      '@timestamp': new Date(annotation['@timestamp']).toISOString(),
    })),
  };
}
