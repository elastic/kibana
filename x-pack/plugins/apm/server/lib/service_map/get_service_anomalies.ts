/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { intersection } from 'lodash';
import { leftJoin } from '../../../common/utils/left_join';
import { Job as AnomalyDetectionJob } from '../../../../ml/server';
import { PromiseReturnType } from '../../../typings/common';
import { IEnvOptions } from './get_service_map';
import {
  APM_ML_JOB_GROUP_NAME,
  encodeForMlApi,
} from '../../../common/ml_job_constants';

type ApmMlJobCategory = NonNullable<ReturnType<typeof getApmMlJobCategory>>;
export const getApmMlJobCategory = (
  mlJob: AnomalyDetectionJob,
  serviceNames: string[]
) => {
  const serviceByGroupNameMap = new Map(
    serviceNames.map((serviceName) => [
      encodeForMlApi(serviceName),
      serviceName,
    ])
  );
  if (!mlJob.groups.includes(APM_ML_JOB_GROUP_NAME)) {
    // ML job missing "apm" group name
    return;
  }
  const apmJobGroups = mlJob.groups.filter(
    (groupName) => groupName !== APM_ML_JOB_GROUP_NAME
  );
  const apmJobServiceNames = apmJobGroups.map(
    (groupName) => serviceByGroupNameMap.get(groupName) || groupName
  );
  const [serviceName] = intersection(apmJobServiceNames, serviceNames);
  if (!serviceName) {
    // APM ML job service was not found
    return;
  }
  const serviceGroupName = encodeForMlApi(serviceName);
  const [transactionType] = apmJobGroups.filter(
    (groupName) => groupName !== serviceGroupName
  );
  if (!transactionType) {
    // APM ML job transaction type was not found.
    return;
  }
  return { jobId: mlJob.job_id, serviceName, transactionType };
};

export type ServiceAnomalies = PromiseReturnType<typeof getServiceAnomalies>;

export async function getServiceAnomalies(
  options: IEnvOptions,
  serviceNames: string[]
) {
  const { start, end, ml } = options.setup;

  if (!ml || serviceNames.length === 0) {
    return [];
  }

  const { jobs: apmMlJobs } = await ml.anomalyDetectors.jobs('apm');
  const apmMlJobCategories = apmMlJobs
    .map((job) => getApmMlJobCategory(job, serviceNames))
    .filter(
      (apmJobCategory) => apmJobCategory !== undefined
    ) as ApmMlJobCategory[];
  const apmJobIds = apmMlJobs.map((job) => job.job_id);
  const params = {
    body: {
      size: 0,
      query: {
        bool: {
          filter: [
            { term: { result_type: 'record' } },
            {
              terms: {
                job_id: apmJobIds,
              },
            },
            {
              range: {
                timestamp: { gte: start, lte: end, format: 'epoch_millis' },
              },
            },
          ],
        },
      },
      aggs: {
        jobs: {
          terms: { field: 'job_id', size: apmJobIds.length },
          aggs: {
            top_score_hits: {
              top_hits: {
                sort: [{ record_score: { order: 'desc' as const } }],
                _source: ['record_score', 'timestamp', 'typical', 'actual'],
                size: 1,
              },
            },
          },
        },
      },
    },
  };

  const response = (await ml.mlSystem.mlAnomalySearch(params)) as {
    aggregations: {
      jobs: {
        buckets: Array<{
          key: string;
          top_score_hits: {
            hits: {
              hits: Array<{
                _source: {
                  record_score: number;
                  timestamp: number;
                  typical: number[];
                  actual: number[];
                };
              }>;
            };
          };
        }>;
      };
    };
  };
  const anomalyScores = response.aggregations.jobs.buckets.map((jobBucket) => {
    const jobId = jobBucket.key;
    const bucketSource = jobBucket.top_score_hits.hits.hits?.[0]?._source;
    return {
      jobId,
      anomalyScore: bucketSource.record_score,
      timestamp: bucketSource.timestamp,
      typical: bucketSource.typical[0],
      actual: bucketSource.actual[0],
    };
  });
  return leftJoin(apmMlJobCategories, 'jobId', anomalyScores);
}
