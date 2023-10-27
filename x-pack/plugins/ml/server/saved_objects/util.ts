/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import {
  type SavedObjectsServiceStart,
  type KibanaRequest,
  type IScopedClusterClient,
  SavedObjectsClient,
} from '@kbn/core/server';
import type { TrainedModelJob, MLSavedObjectService } from './service';
import { ML_JOB_SAVED_OBJECT_TYPE } from '../../common/types/saved_objects';

export function savedObjectClientsFactory(
  getSavedObjectsStart: () => SavedObjectsServiceStart | null
) {
  return {
    // create a saved object client scoped to the current request
    // which has access to ml-job objects
    getMlSavedObjectsClient: (request: KibanaRequest) => {
      const savedObjectsStart = getSavedObjectsStart();
      if (savedObjectsStart === null) {
        return null;
      }
      return savedObjectsStart.getScopedClient(request, {
        includedHiddenTypes: [ML_JOB_SAVED_OBJECT_TYPE],
      });
    },
    // create a saved object client which has access to all saved objects
    // no matter the space access of the current user.
    getInternalSavedObjectsClient: () => {
      const savedObjectsStart = getSavedObjectsStart();
      if (savedObjectsStart === null) {
        return null;
      }
      const savedObjectsRepo = savedObjectsStart.createInternalRepository();
      return new SavedObjectsClient(savedObjectsRepo);
    },
  };
}

export function getSavedObjectClientError(error: any) {
  return error.isBoom && error.output?.payload ? error.output.payload : error.body ?? error;
}

export function getJobDetailsFromTrainedModel(
  model: estypes.MlTrainedModelConfig | estypes.MlPutTrainedModelRequest['body']
): TrainedModelJob | null {
  // @ts-ignore types are wrong
  if (model.metadata?.analytics_config === undefined) {
    return null;
  }

  // @ts-ignore types are wrong
  const jobId: string = model.metadata.analytics_config.id;
  // @ts-ignore types are wrong
  const createTime: number = model.metadata.analytics_config.create_time;
  return { job_id: jobId, create_time: createTime };
}

/*
 * Function for calling elasticsearch APIs for retrieving ML jobs and models.
 * The elasticsearch api may be missing in a serverless environment, in which case
 * we return null.
 */

export function mlFunctionsFactory(client: IScopedClusterClient) {
  return {
    async getJobs() {
      try {
        return await client.asInternalUser.ml.getJobs();
      } catch (error) {
        return null;
      }
    },
    async getDatafeeds() {
      try {
        return await client.asInternalUser.ml.getDatafeeds();
      } catch (error) {
        return null;
      }
    },
    async getTrainedModels() {
      try {
        return await client.asInternalUser.ml.getTrainedModels();
      } catch (error) {
        return null;
      }
    },
    async getDataFrameAnalytics() {
      try {
        return await client.asInternalUser.ml.getDataFrameAnalytics();
      } catch (error) {
        return null;
      }
    },
  };
}

/*
 * Function for retrieving lists of jobs, models and saved objects.
 * If any of the elasticsearch APIs are missing, it returns empty arrays
 * so that the sync process does not create or delete any saved objects.
 */

export async function getJobsAndModels(
  client: IScopedClusterClient,
  mlSavedObjectService: MLSavedObjectService
) {
  const { getJobs, getDatafeeds, getTrainedModels, getDataFrameAnalytics } =
    mlFunctionsFactory(client);

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
    mlSavedObjectService.getAllJobObjects(undefined, false),
    mlSavedObjectService.getAllJobObjectsForAllSpaces(),
    mlSavedObjectService.getAllTrainedModelObjects(false),
    mlSavedObjectService.getAllTrainedModelObjectsForAllSpaces(),
    getJobs(),
    getDatafeeds(),
    getDataFrameAnalytics(),
    getTrainedModels(),
  ]);

  const adJobObjects =
    adJobs !== null ? jobObjects.filter((j) => j.attributes.type === 'anomaly-detector') : [];
  const adAllJobObjects =
    adJobs !== null ? allJobObjects.filter((j) => j.attributes.type === 'anomaly-detector') : [];
  const dfaJobObjects =
    dfaJobs !== null ? jobObjects.filter((j) => j.attributes.type === 'data-frame-analytics') : [];
  const dfaAllJobObjects =
    dfaJobs !== null
      ? allJobObjects.filter((j) => j.attributes.type === 'data-frame-analytics')
      : [];

  return {
    jobObjects: [...adJobObjects, ...dfaJobObjects],
    allJobObjects: [...adAllJobObjects, ...dfaAllJobObjects],
    modelObjects: models === null ? [] : modelObjects,
    allModelObjects: models === null ? [] : allModelObjects,
    adJobs: adJobs === null ? [] : adJobs.jobs,
    datafeeds: datafeeds === null ? [] : datafeeds.datafeeds,
    dfaJobs: dfaJobs === null ? [] : dfaJobs.data_frame_analytics,
    models: models === null ? [] : models.trained_model_configs,
  };
}
