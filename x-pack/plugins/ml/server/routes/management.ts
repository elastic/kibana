/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { wrapError } from '../client/error_wrapper';
import type { RouteInitialization } from '../types';
import { listTypeSchema } from './schemas/management_schema';

import { jobServiceProvider } from '../models/job_service';
import { checksFactory } from '../saved_objects';
import { BUILT_IN_MODEL_TAG } from '../../common/constants/data_frame_analytics';
import { BUILT_IN_MODEL_TYPE } from '../../common/constants/trained_models';
import type {
  AnomalyDetectionManagementItems,
  AnalyticsManagementItems,
  TrainedModelsManagementItems,
} from '../../common/types/management';

/**
 * Routes for management service
 */
export function managementRoutes({ router, routeGuard }: RouteInitialization) {
  /**
   * @apiGroup Management
   *
   * @api {get} /api/ml/management/list/:listType Management list
   * @apiName ManagementList
   * @apiDescription Returns a list of anomaly detection jobs, data frame analytics jobs or trained models
   *
   * @apiSchema (params) listTypeSchema
   *
   */
  router.get(
    {
      path: '/api/ml/management/list/{listType}',
      validate: {
        params: listTypeSchema,
      },
      options: {
        tags: [
          'access:ml:canCreateJob',
          'access:ml:canCreateDataFrameAnalytics',
          'access:ml:canCreateTrainedModels',
        ],
      },
    },
    routeGuard.fullLicenseAPIGuard(
      async ({ client, mlClient, request, response, mlSavedObjectService }) => {
        try {
          const { listType } = request.params;
          const { jobsSpaces, trainedModelsSpaces } = checksFactory(client, mlSavedObjectService);

          switch (listType) {
            case 'anomaly-detector':
              const { jobsSummary } = jobServiceProvider(client, mlClient);
              const [jobs, adJobStatus] = await Promise.all([jobsSummary(), jobsSpaces()]);

              const adJobsWithSpaces: AnomalyDetectionManagementItems[] = jobs.map((job) => {
                return {
                  id: job.id,
                  description: job.description,
                  jobState: job.jobState,
                  datafeedState: job.datafeedState,
                  spaces: adJobStatus['anomaly-detector'][job.id] ?? [],
                };
              });

              return response.ok({
                body: adJobsWithSpaces,
              });
            case 'data-frame-analytics':
              const [
                { data_frame_analytics: dfaJobs },
                { data_frame_analytics: dfaJobsStats },
                dfaJobStatus,
              ] = await Promise.all([
                mlClient.getDataFrameAnalytics({
                  size: 10000,
                }),
                mlClient.getDataFrameAnalyticsStats({
                  size: 10000,
                }),
                jobsSpaces(),
              ]);

              const dfaStatsMapped = dfaJobsStats.reduce((acc, cur) => {
                acc[cur.id] = cur;
                return acc;
              }, {} as Record<string, estypes.MlDataframeAnalytics>);

              const dfaJobsWithSpaces: AnalyticsManagementItems[] = dfaJobs.map((j) => {
                const id = j.id;
                return {
                  id,
                  description: j.description ?? '',
                  source_index: j.source.index as string[], // esclient types are wrong
                  dest_index: j.dest.index,
                  job_type: Object.keys(j.analysis)[0] ?? '',
                  state: dfaStatsMapped[id]?.state ?? '',
                  spaces: dfaJobStatus['data-frame-analytics'][id] ?? [],
                };
              });
              return response.ok({
                body: dfaJobsWithSpaces,
              });

            case 'trained-model':
              const [
                { trained_model_configs: models },
                { trained_model_stats: modelsStats },
                modelSpaces,
              ] = await Promise.all([
                mlClient.getTrainedModels(),
                mlClient.getTrainedModelsStats(),
                trainedModelsSpaces(),
              ]);

              const modelStatsMapped = modelsStats.reduce((acc, cur) => {
                acc[cur.model_id] = cur;
                return acc;
              }, {} as Record<string, estypes.MlTrainedModelStats>);

              const modelsWithSpaces: TrainedModelsManagementItems[] = models.map((m) => {
                const id = m.model_id;
                return {
                  id,
                  description: m.description ?? '',
                  state: modelStatsMapped[id].deployment_stats?.state ?? '',
                  type: [
                    m.model_type,
                    ...Object.keys(m.inference_config),
                    ...(m.tags.includes(BUILT_IN_MODEL_TAG) ? [BUILT_IN_MODEL_TYPE] : []),
                  ],
                  spaces: modelSpaces.trainedModels[id] ?? [],
                };
              });
              return response.ok({
                body: modelsWithSpaces,
              });
            default:
              // this should never be hit because of the route's schema checks.
              throw Error('Specified listType not supported');
          }
        } catch (e) {
          return response.customError(wrapError(e));
        }
      }
    )
  );
}
