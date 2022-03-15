/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { IScopedClusterClient, KibanaRequest, SavedObjectsFindResult } from 'kibana/server';
import type {
  JobSavedObjectService,
  TrainedModelJob,
  JobObject,
  TrainedModelObject,
} from './service';
import type {
  JobType,
  DeleteMLSpaceAwareItemsCheckResponse,
  TrainedModelType,
} from '../../common/types/saved_objects';

import type { DataFrameAnalyticsConfig } from '../../common/types/data_frame_analytics';
import type { ResolveMlCapabilities } from '../../common/types/capabilities';
import { getJobDetailsFromTrainedModel } from './util';

export interface JobSavedObjectStatus {
  jobId: string;
  type: JobType;
  datafeedId?: string | null;
  namespaces: string[] | undefined;
  checks: {
    jobExists: boolean;
    datafeedExists?: boolean;
  };
}

export interface TrainedModelSavedObjectStatus {
  modelId: string;
  namespaces: string[] | undefined;
  job: null | TrainedModelJob;
  checks: {
    trainedModelExists: boolean;
    dfaJobExists: boolean | null;
  };
}

export interface JobStatus {
  jobId: string;
  datafeedId?: string | null;
  checks: {
    savedObjectExits: boolean;
  };
}

export interface TrainedModelStatus {
  modelId: string;
  checks: {
    savedObjectExits: boolean;
    dfaJobReferenced: boolean | null;
  };
}

export interface StatusResponse {
  savedObjects: {
    'anomaly-detector': JobSavedObjectStatus[];
    'data-frame-analytics': JobSavedObjectStatus[];
    'trained-model': TrainedModelSavedObjectStatus[];
  };
  jobs: {
    'anomaly-detector': JobStatus[];
    'data-frame-analytics': JobStatus[];
    'trained-model': TrainedModelStatus[];
  };
}

export function checksFactory(
  client: IScopedClusterClient,
  jobSavedObjectService: JobSavedObjectService
) {
  async function checkStatus(): Promise<StatusResponse> {
    const [
      jobObjects,
      allJobObjects,
      modelObjects,
      allModelObjects,
      adJobs,
      datafeeds,
      dfaJobs,
      models,
    ] = await Promise.all([
      jobSavedObjectService.getAllJobObjects(undefined, false),
      jobSavedObjectService.getAllJobObjectsForAllSpaces(),
      jobSavedObjectService.getAllTrainedModelObjects(false),
      jobSavedObjectService.getAllTrainedModelObjectsForAllSpaces(),
      client.asInternalUser.ml.getJobs(),
      client.asInternalUser.ml.getDatafeeds(),
      client.asInternalUser.ml.getDataFrameAnalytics() as unknown as {
        data_frame_analytics: DataFrameAnalyticsConfig[];
      },
      client.asInternalUser.ml.getTrainedModels(),
    ]);

    const jobSavedObjectsStatus: JobSavedObjectStatus[] = jobObjects.map(
      ({ attributes, namespaces }) => {
        const type: JobType = attributes.type;
        const jobId = attributes.job_id;
        const datafeedId = type === 'anomaly-detector' ? attributes.datafeed_id : undefined;

        let jobExists = false;
        let datafeedExists: boolean | undefined;

        if (type === 'anomaly-detector') {
          jobExists = adJobs.jobs.some((j) => j.job_id === jobId);
          datafeedExists = datafeeds.datafeeds.some((d) => d.job_id === jobId);
        } else {
          jobExists = dfaJobs.data_frame_analytics.some((j) => j.id === jobId);
        }

        return {
          jobId,
          type,
          datafeedId,
          namespaces,
          checks: {
            jobExists,
            datafeedExists,
          },
        };
      }
    );

    const dfaJobsCreateTimeMap = dfaJobs.data_frame_analytics.reduce((acc, cur) => {
      acc.set(cur.id, cur.create_time);
      return acc;
    }, new Map<string, number>());

    const modelJobExits = models.trained_model_configs.reduce((acc, cur) => {
      const job = getJobDetailsFromTrainedModel(cur);
      if (job === null) {
        return acc;
      }

      const { job_id: jobId, create_time: createTime } = job;
      const exists = createTime === dfaJobsCreateTimeMap.get(jobId);

      if (jobId && createTime) {
        acc.set(cur.model_id, exists);
      }
      return acc;
    }, new Map<string, boolean | null>());

    const modelSavedObjectsStatus: TrainedModelSavedObjectStatus[] = modelObjects.map(
      ({ attributes: { job, model_id: modelId }, namespaces }) => {
        const trainedModelExists = models.trained_model_configs.some((m) => m.model_id === modelId);
        const dfaJobExists = modelJobExits.get(modelId) ?? null;

        return {
          modelId,
          namespaces,
          job,
          checks: {
            trainedModelExists,
            dfaJobExists,
          },
        };
      }
    );

    const nonSpaceADObjectIds = new Set(
      allJobObjects
        .filter(({ attributes }) => attributes.type === 'anomaly-detector')
        .map(({ attributes }) => attributes.job_id)
    );
    const nonSpaceDFAObjectIds = new Set(
      allJobObjects
        .filter(({ attributes }) => attributes.type === 'data-frame-analytics')
        .map(({ attributes }) => attributes.job_id)
    );

    const nonSpaceModelObjectIds = new Map(
      allModelObjects.map((model) => [model.attributes.model_id, model])
    );

    const adObjectIds = new Set(
      jobSavedObjectsStatus
        .filter(({ type }) => type === 'anomaly-detector')
        .map(({ jobId }) => jobId)
    );
    const dfaObjectIds = new Set(
      jobSavedObjectsStatus
        .filter(({ type }) => type === 'data-frame-analytics')
        .map(({ jobId }) => jobId)
    );
    const modelObjectIds = new Set(modelSavedObjectsStatus.map(({ modelId }) => modelId));

    const anomalyDetectorsStatus = adJobs.jobs
      .filter(({ job_id: jobId }) => {
        // only list jobs which are in the current space (adObjectIds)
        // or are not in any spaces (nonSpaceADObjectIds)
        return adObjectIds.has(jobId) === true || nonSpaceADObjectIds.has(jobId) === false;
      })
      .map(({ job_id: jobId }) => {
        const datafeedId = datafeeds.datafeeds.find((df) => df.job_id === jobId)?.datafeed_id;
        return {
          jobId,
          datafeedId: datafeedId ?? null,
          checks: {
            savedObjectExits: nonSpaceADObjectIds.has(jobId),
          },
        };
      });

    const dataFrameAnalyticsStatus = dfaJobs.data_frame_analytics
      .filter(({ id: jobId }) => {
        // only list jobs which are in the current space (dfaObjectIds)
        // or are not in any spaces (nonSpaceDFAObjectIds)
        return dfaObjectIds.has(jobId) === true || nonSpaceDFAObjectIds.has(jobId) === false;
      })
      .map(({ id: jobId }) => {
        return {
          jobId,
          datafeedId: null,
          checks: {
            savedObjectExits: nonSpaceDFAObjectIds.has(jobId),
          },
        };
      });

    const modelsStatus = models.trained_model_configs
      .filter(({ model_id: modelId }) => {
        // only list jobs which are in the current space (adObjectIds)
        // or are not in any spaces (nonSpaceADObjectIds)
        return (
          modelObjectIds.has(modelId) === true || nonSpaceModelObjectIds.has(modelId) === false
        );
      })
      .map((model: estypes.MlTrainedModelConfig) => {
        const modelId = model.model_id;
        const modelObject = nonSpaceModelObjectIds.get(modelId);
        const savedObjectExits = modelObject !== undefined;
        const job = getJobDetailsFromTrainedModel(model);
        let dfaJobReferenced = null;
        if (job !== null) {
          dfaJobReferenced =
            modelObject?.attributes.job?.job_id === job.job_id &&
            modelObject?.attributes.job?.create_time === job.create_time;
        }

        return {
          modelId,
          checks: {
            savedObjectExits,
            dfaJobReferenced,
          },
        };
      });

    return {
      savedObjects: {
        'anomaly-detector': jobSavedObjectsStatus.filter(({ type }) => type === 'anomaly-detector'),
        'data-frame-analytics': jobSavedObjectsStatus.filter(
          ({ type }) => type === 'data-frame-analytics'
        ),
        'trained-model': modelSavedObjectsStatus,
      },
      jobs: {
        'anomaly-detector': anomalyDetectorsStatus,
        'data-frame-analytics': dataFrameAnalyticsStatus,
        'trained-model': modelsStatus,
      },
    };
  }

  async function canDeleteMLSpaceAwareItems(
    request: KibanaRequest,
    jobType: JobType | TrainedModelType,
    ids: string[],
    spacesEnabled: boolean,
    resolveMlCapabilities: ResolveMlCapabilities
  ): Promise<DeleteMLSpaceAwareItemsCheckResponse> {
    if (['anomaly-detector', 'data-frame-analytics', 'trained-model'].includes(jobType) === false) {
      throw Boom.badRequest(
        'Saved object type must be "anomaly-detector", "data-frame-analytics" or "trained-model'
      );
    }

    const mlCapabilities = await resolveMlCapabilities(request);
    if (mlCapabilities === null) {
      throw Boom.internal('mlCapabilities is not defined');
    }

    if (
      (jobType === 'anomaly-detector' && mlCapabilities.canDeleteJob === false) ||
      (jobType === 'data-frame-analytics' && mlCapabilities.canDeleteDataFrameAnalytics === false)
    ) {
      // user does not have access to delete jobs.
      return ids.reduce((results, id) => {
        results[id] = {
          canDelete: false,
          canRemoveFromSpace: false,
        };
        return results;
      }, {} as DeleteMLSpaceAwareItemsCheckResponse);
    } else if (jobType === 'trained-model' && mlCapabilities.canDeleteTrainedModels === false) {
      // user does not have access to delete trained models.
      return ids.reduce((results, id) => {
        results[id] = {
          canDelete: false,
          canRemoveFromSpace: false,
        };
        return results;
      }, {} as DeleteMLSpaceAwareItemsCheckResponse);
    }

    if (spacesEnabled === false) {
      // spaces are disabled, delete only no untagging
      return ids.reduce((results, id) => {
        results[id] = {
          canDelete: true,
          canRemoveFromSpace: false,
        };
        return results;
      }, {} as DeleteMLSpaceAwareItemsCheckResponse);
    }
    const canCreateGlobalMlSavedObjects = await jobSavedObjectService.canCreateGlobalMlSavedObjects(
      jobType,
      request
    );

    const savedObjects =
      jobType === 'trained-model'
        ? await Promise.all(ids.map((id) => jobSavedObjectService.getTrainedModelObject(id)))
        : await Promise.all(ids.map((id) => jobSavedObjectService.getJobObject(jobType, id)));

    return ids.reduce((results, id) => {
      const savedObject =
        jobType === 'trained-model'
          ? (savedObjects as Array<SavedObjectsFindResult<TrainedModelObject> | undefined>).find(
              (j) => j?.attributes.model_id === id
            )
          : (savedObjects as Array<SavedObjectsFindResult<JobObject> | undefined>).find(
              (j) => j?.attributes.job_id === id
            );

      if (savedObject === undefined || savedObject.namespaces === undefined) {
        // job saved object not found
        results[id] = {
          canDelete: false,
          canRemoveFromSpace: false,
        };
        return results;
      }

      const { namespaces } = savedObject;
      const isGlobalSavedObject = namespaces.includes('*');

      // job is in * space, user can see all spaces - delete and no option to untag
      if (canCreateGlobalMlSavedObjects && isGlobalSavedObject) {
        results[id] = {
          canDelete: true,
          canRemoveFromSpace: false,
        };
        return results;
      }

      // job is in * space, user cannot see all spaces - no untagging, no deleting
      if (isGlobalSavedObject) {
        results[id] = {
          canDelete: false,
          canRemoveFromSpace: false,
        };
        return results;
      }

      // jobs with are in individual spaces can only be untagged
      // from current space if the job is in more than 1 space
      const canRemoveFromSpace = namespaces.length > 1;

      // job is in individual spaces, user cannot see all of them - untag only, no delete
      if (namespaces.includes('?')) {
        results[id] = {
          canDelete: false,
          canRemoveFromSpace,
        };
        return results;
      }

      // job is individual spaces, user can see all of them - delete and option to untag
      results[id] = {
        canDelete: true,
        canRemoveFromSpace,
      };
      return results;
    }, {} as DeleteMLSpaceAwareItemsCheckResponse);
  }

  return { checkStatus, canDeleteMLSpaceAwareItems };
}
