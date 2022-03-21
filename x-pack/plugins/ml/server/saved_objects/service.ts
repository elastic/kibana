/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import RE2 from 're2';
import {
  KibanaRequest,
  SavedObjectsClientContract,
  SavedObjectsFindOptions,
  SavedObjectsFindResult,
  IScopedClusterClient,
} from 'kibana/server';
import type { SecurityPluginSetup } from '../../../security/server';
import type {
  JobType,
  TrainedModelType,
  SavedObjectResult,
  MlSavedObjectType,
} from '../../common/types/saved_objects';
import {
  ML_JOB_SAVED_OBJECT_TYPE,
  ML_TRAINED_MODEL_SAVED_OBJECT_TYPE,
} from '../../common/types/saved_objects';
import { MLJobNotFound, MLModelNotFound } from '../lib/ml_client';
import { getSavedObjectClientError } from './util';
import { authorizationProvider } from './authorization';

export interface JobObject {
  job_id: string;
  datafeed_id: string | null;
  type: JobType;
}
type JobObjectFilter = { [k in keyof JobObject]?: string };

export interface TrainedModelObject {
  model_id: string;
  job: null | TrainedModelJob;
}

export interface TrainedModelJob {
  job_id: string;
  create_time: number;
}

type TrainedModelObjectFilter = { [k in keyof TrainedModelObject]?: string };

export type MLSavedObjectService = ReturnType<typeof mlSavedObjectServiceFactory>;

export function mlSavedObjectServiceFactory(
  savedObjectsClient: SavedObjectsClientContract,
  internalSavedObjectsClient: SavedObjectsClientContract,
  spacesEnabled: boolean,
  authorization: SecurityPluginSetup['authz'] | undefined,
  client: IScopedClusterClient,
  isMlReady: () => Promise<void>
) {
  async function _getJobObjects(
    jobType?: JobType,
    jobId?: string,
    datafeedId?: string,
    currentSpaceOnly: boolean = true
  ) {
    await isMlReady();
    const filterObject: JobObjectFilter = {};

    if (jobType !== undefined) {
      filterObject.type = jobType;
    }
    if (jobId !== undefined) {
      filterObject.job_id = jobId;
    } else if (datafeedId !== undefined) {
      filterObject.datafeed_id = datafeedId;
    }
    const { filter, searchFields } = createSavedObjectFilter(
      filterObject,
      ML_JOB_SAVED_OBJECT_TYPE
    );

    const options: SavedObjectsFindOptions = {
      type: ML_JOB_SAVED_OBJECT_TYPE,
      perPage: 10000,
      ...(spacesEnabled === false || currentSpaceOnly === true ? {} : { namespaces: ['*'] }),
      searchFields,
      filter,
    };

    const jobs = await savedObjectsClient.find<JobObject>(options);

    return jobs.saved_objects;
  }

  async function _createJob(jobType: JobType, jobId: string, datafeedId?: string) {
    await isMlReady();

    const job: JobObject = {
      job_id: jobId,
      datafeed_id: datafeedId ?? null,
      type: jobType,
    };

    const id = _jobSavedObjectId(job);

    try {
      const [existingJobObject] = await getAllJobObjectsForAllSpaces(jobType, jobId);
      if (existingJobObject !== undefined) {
        // a saved object for this job already exists, this may be left over from a previously deleted job
        if (existingJobObject.namespaces?.length) {
          // use a force delete just in case the saved object exists only in another space.
          await _forceDeleteJob(jobType, jobId, existingJobObject.namespaces[0]);
        } else {
          // the saved object has no spaces, this is unexpected, attempt a normal delete
          await savedObjectsClient.delete(ML_JOB_SAVED_OBJECT_TYPE, id, { force: true });
        }
      }
    } catch (error) {
      // the saved object may exist if a previous job with the same ID has been deleted.
      // if not, this error will be throw which we ignore.
    }

    await savedObjectsClient.create<JobObject>(ML_JOB_SAVED_OBJECT_TYPE, job, {
      id,
    });
  }

  async function _bulkCreateJobs(jobs: Array<{ job: JobObject; namespaces: string[] }>) {
    await isMlReady();
    return await savedObjectsClient.bulkCreate<JobObject>(
      jobs.map((j) => ({
        type: ML_JOB_SAVED_OBJECT_TYPE,
        id: _jobSavedObjectId(j.job),
        attributes: j.job,
        initialNamespaces: j.namespaces,
      }))
    );
  }

  function _jobSavedObjectId(job: JobObject) {
    return `${job.type}-${job.job_id}`;
  }

  async function _deleteJob(jobType: JobType, jobId: string) {
    const jobs = await _getJobObjects(jobType, jobId);
    const job = jobs[0];
    if (job === undefined) {
      throw new MLJobNotFound('job not found');
    }

    await savedObjectsClient.delete(ML_JOB_SAVED_OBJECT_TYPE, job.id, { force: true });
  }

  async function _forceDeleteJob(jobType: JobType, jobId: string, namespace: string) {
    const id = _jobSavedObjectId({
      job_id: jobId,
      datafeed_id: null,
      type: jobType,
    });

    // * space cannot be used in a delete call, so use undefined which
    // is the same as specifying the default space
    await internalSavedObjectsClient.delete(ML_JOB_SAVED_OBJECT_TYPE, id, {
      namespace: namespace === '*' ? undefined : namespace,
      force: true,
    });
  }

  async function createAnomalyDetectionJob(jobId: string, datafeedId?: string) {
    await _createJob('anomaly-detector', jobId, datafeedId);
  }

  async function deleteAnomalyDetectionJob(jobId: string) {
    await _deleteJob('anomaly-detector', jobId);
  }

  async function forceDeleteAnomalyDetectionJob(jobId: string, namespace: string) {
    await _forceDeleteJob('anomaly-detector', jobId, namespace);
  }

  async function createDataFrameAnalyticsJob(jobId: string) {
    await _createJob('data-frame-analytics', jobId);
  }

  async function deleteDataFrameAnalyticsJob(jobId: string) {
    await _deleteJob('data-frame-analytics', jobId);
  }

  async function forceDeleteDataFrameAnalyticsJob(jobId: string, namespace: string) {
    await _forceDeleteJob('data-frame-analytics', jobId, namespace);
  }

  async function bulkCreateJobs(jobs: Array<{ job: JobObject; namespaces: string[] }>) {
    return await _bulkCreateJobs(jobs);
  }

  async function getAllJobObjects(jobType?: JobType, currentSpaceOnly: boolean = true) {
    return await _getJobObjects(jobType, undefined, undefined, currentSpaceOnly);
  }

  async function getJobObject(
    jobType: JobType,
    jobId: string,
    currentSpaceOnly: boolean = true
  ): Promise<SavedObjectsFindResult<JobObject> | undefined> {
    const [jobObject] = await _getJobObjects(jobType, jobId, undefined, currentSpaceOnly);
    return jobObject;
  }

  async function getAllJobObjectsForAllSpaces(jobType?: JobType, jobId?: string) {
    await isMlReady();
    const filterObject: JobObjectFilter = {};

    if (jobType !== undefined) {
      filterObject.type = jobType;
    }

    if (jobId !== undefined) {
      filterObject.job_id = jobId;
    }

    const { filter, searchFields } = createSavedObjectFilter(
      filterObject,
      ML_JOB_SAVED_OBJECT_TYPE
    );
    const options: SavedObjectsFindOptions = {
      type: ML_JOB_SAVED_OBJECT_TYPE,
      perPage: 10000,
      ...(spacesEnabled === false ? {} : { namespaces: ['*'] }),
      searchFields,
      filter,
    };

    return (await internalSavedObjectsClient.find<JobObject>(options)).saved_objects;
  }

  async function addDatafeed(datafeedId: string, jobId: string) {
    const jobs = await _getJobObjects('anomaly-detector', jobId);
    const job = jobs[0];
    if (job === undefined) {
      throw new MLJobNotFound(`'${datafeedId}' not found`);
    }

    const jobObject = job.attributes;
    jobObject.datafeed_id = datafeedId;
    await savedObjectsClient.update<JobObject>(ML_JOB_SAVED_OBJECT_TYPE, job.id, jobObject);
  }

  async function deleteDatafeed(datafeedId: string) {
    const jobs = await _getJobObjects('anomaly-detector', undefined, datafeedId);
    const job = jobs[0];
    if (job === undefined) {
      throw new MLJobNotFound(`'${datafeedId}' not found`);
    }

    const jobObject = job.attributes;
    jobObject.datafeed_id = null;
    await savedObjectsClient.update<JobObject>(ML_JOB_SAVED_OBJECT_TYPE, job.id, jobObject);
  }

  async function _getIds(jobType: JobType, idType: keyof JobObject) {
    const jobs = await _getJobObjects(jobType);
    return jobs.map((o) => o.attributes[idType]);
  }

  async function _filterJobObjectsForSpace<T>(
    jobType: JobType,
    list: T[],
    field: keyof T,
    key: keyof JobObject
  ): Promise<T[]> {
    if (list.length === 0) {
      return [];
    }
    const jobIds = await _getIds(jobType, key);
    return list.filter((j) => jobIds.includes(j[field] as unknown as string));
  }

  async function filterJobsForSpace<T>(jobType: JobType, list: T[], field: keyof T): Promise<T[]> {
    return _filterJobObjectsForSpace<T>(jobType, list, field, 'job_id');
  }

  async function filterDatafeedsForSpace<T>(
    jobType: JobType,
    list: T[],
    field: keyof T
  ): Promise<T[]> {
    return _filterJobObjectsForSpace<T>(jobType, list, field, 'datafeed_id');
  }

  async function _filterJobObjectIdsForSpace(
    jobType: JobType,
    ids: string[],
    key: keyof JobObject,
    allowWildcards: boolean = false
  ): Promise<string[]> {
    if (ids.length === 0) {
      return [];
    }

    const jobIds = await _getIds(jobType, key);
    // check to see if any of the ids supplied contain a wildcard
    if (allowWildcards === false || ids.join().match('\\*') === null) {
      // wildcards are not allowed or no wildcards could be found
      return ids.filter((id) => jobIds.includes(id));
    }

    // if any of the ids contain a wildcard, check each one.
    return ids.filter((id) => {
      if (id.match('\\*') === null) {
        return jobIds.includes(id);
      }
      const regex = new RE2(id.replace('*', '.*'));
      return jobIds.some((jId) => typeof jId === 'string' && regex.exec(jId));
    });
  }

  async function filterJobIdsForSpace(
    jobType: JobType,
    ids: string[],
    allowWildcards: boolean = false
  ): Promise<string[]> {
    return _filterJobObjectIdsForSpace(jobType, ids, 'job_id', allowWildcards);
  }

  async function filterDatafeedIdsForSpace(
    ids: string[],
    allowWildcards: boolean = false
  ): Promise<string[]> {
    return _filterJobObjectIdsForSpace('anomaly-detector', ids, 'datafeed_id', allowWildcards);
  }

  async function updateJobsSpaces(
    jobType: JobType,
    jobIds: string[],
    spacesToAdd: string[],
    spacesToRemove: string[]
  ): Promise<SavedObjectResult> {
    const type = jobType;
    if (jobIds.length === 0 || (spacesToAdd.length === 0 && spacesToRemove.length === 0)) {
      return {};
    }

    const results: SavedObjectResult = {};
    const jobs = await _getJobObjects(jobType);
    const jobObjectIdMap = new Map<string, string>();
    const jobObjectsToUpdate: Array<{ type: string; id: string }> = [];

    for (const jobId of jobIds) {
      const job = jobs.find((j) => j.attributes.job_id === jobId);
      if (job === undefined) {
        results[jobId] = {
          success: false,
          type,
          error: createJobError(jobId, 'job_id'),
        };
      } else {
        jobObjectIdMap.set(job.id, jobId);
        jobObjectsToUpdate.push({ type: ML_JOB_SAVED_OBJECT_TYPE, id: job.id });
      }
    }

    try {
      const updateResult = await savedObjectsClient.updateObjectsSpaces(
        jobObjectsToUpdate,
        spacesToAdd,
        spacesToRemove
      );
      updateResult.objects.forEach(({ id: objectId, error }) => {
        const jobId = jobObjectIdMap.get(objectId)!;
        if (error) {
          results[jobId] = {
            success: false,
            type,
            error: getSavedObjectClientError(error),
          };
        } else {
          results[jobId] = {
            success: true,
            type,
          };
        }
      });
    } catch (error) {
      // If the entire operation failed, return success: false for each job
      const clientError = getSavedObjectClientError(error);
      jobObjectsToUpdate.forEach(({ id: objectId }) => {
        const jobId = jobObjectIdMap.get(objectId)!;
        results[jobId] = {
          success: false,
          type,
          error: clientError,
        };
      });
    }

    return { ...results };
  }

  async function canCreateGlobalMlSavedObjects(
    mlSavedObjectType: MlSavedObjectType,
    request: KibanaRequest
  ) {
    if (authorization === undefined) {
      return true;
    }
    const { authorizationCheck } = authorizationProvider(authorization);
    const { canCreateJobsGlobally, canCreateTrainedModelsGlobally } = await authorizationCheck(
      request
    );
    return mlSavedObjectType === 'trained-model'
      ? canCreateTrainedModelsGlobally
      : canCreateJobsGlobally;
  }

  async function getTrainedModelObject(
    modelId: string,
    currentSpaceOnly: boolean = true
  ): Promise<SavedObjectsFindResult<TrainedModelObject> | undefined> {
    const [modelObject] = await _getTrainedModelObjects(modelId, currentSpaceOnly);
    return modelObject;
  }

  async function createTrainedModel(modelId: string, job: TrainedModelJob | null) {
    await _createTrainedModel(modelId, job);
  }

  async function bulkCreateTrainedModel(models: TrainedModelObject[], namespaceFallback?: string) {
    return await _bulkCreateTrainedModel(models, namespaceFallback);
  }

  async function deleteTrainedModel(modelId: string) {
    await _deleteTrainedModel(modelId);
  }

  async function forceDeleteTrainedModel(modelId: string, namespace: string) {
    await _forceDeleteTrainedModel(modelId, namespace);
  }

  async function getAllTrainedModelObjects(currentSpaceOnly: boolean = true) {
    return await _getTrainedModelObjects(undefined, currentSpaceOnly);
  }

  async function _getTrainedModelObjects(modelId?: string, currentSpaceOnly: boolean = true) {
    await isMlReady();
    const filterObject: TrainedModelObjectFilter = {};

    if (modelId !== undefined) {
      filterObject.model_id = modelId;
    }

    const { filter, searchFields } = createSavedObjectFilter(
      filterObject,
      ML_TRAINED_MODEL_SAVED_OBJECT_TYPE
    );

    const options: SavedObjectsFindOptions = {
      type: ML_TRAINED_MODEL_SAVED_OBJECT_TYPE,
      perPage: 10000,
      ...(spacesEnabled === false || currentSpaceOnly === true ? {} : { namespaces: ['*'] }),
      searchFields,
      filter,
    };

    const models = await savedObjectsClient.find<TrainedModelObject>(options);

    return models.saved_objects;
  }

  async function _createTrainedModel(modelId: string, job: TrainedModelJob | null) {
    await isMlReady();

    const modelObject: TrainedModelObject = {
      model_id: modelId,
      job,
    };

    try {
      const [existingModelObject] = await getAllTrainedModelObjectsForAllSpaces([modelId]);
      if (existingModelObject !== undefined) {
        // a saved object for this job already exists, this may be left over from a previously deleted job
        if (existingModelObject.namespaces?.length) {
          // use a force delete just in case the saved object exists only in another space.
          await _forceDeleteTrainedModel(modelId, existingModelObject.namespaces[0]);
        } else {
          // the saved object has no spaces, this is unexpected, attempt a normal delete
          await savedObjectsClient.delete(ML_TRAINED_MODEL_SAVED_OBJECT_TYPE, modelId, {
            force: true,
          });
        }
      }
    } catch (error) {
      // the saved object may exist if a previous job with the same ID has been deleted.
      // if not, this error will be throw which we ignore.
    }
    let initialNamespaces;
    // if a job exists for this model, ensure the initial namespaces for the model
    // are the same as the job
    if (job !== null) {
      const [existingJobObject] = await getAllJobObjectsForAllSpaces(
        'data-frame-analytics',
        job.job_id
      );

      initialNamespaces = existingJobObject?.namespaces ?? undefined;
    }

    await savedObjectsClient.create<TrainedModelObject>(
      ML_TRAINED_MODEL_SAVED_OBJECT_TYPE,
      modelObject,
      {
        id: modelId,
        ...(initialNamespaces ? { initialNamespaces } : {}),
      }
    );
  }

  async function _bulkCreateTrainedModel(models: TrainedModelObject[], namespaceFallback?: string) {
    await isMlReady();

    const namespacesPerJob = (await getAllJobObjectsForAllSpaces()).reduce((acc, cur) => {
      acc[cur.attributes.job_id] = cur.namespaces;
      return acc;
    }, {} as Record<string, string[] | undefined>);

    return await savedObjectsClient.bulkCreate<TrainedModelObject>(
      models.map((m) => {
        let initialNamespaces = m.job && namespacesPerJob[m.job.job_id];
        if (!initialNamespaces?.length && namespaceFallback) {
          // use the namespace fallback if it is defined and no namespaces can
          // be found for a related job.
          // otherwise initialNamespaces will be undefined and the SO client will
          // use the current space.
          initialNamespaces = [namespaceFallback];
        }
        return {
          type: ML_TRAINED_MODEL_SAVED_OBJECT_TYPE,
          id: m.model_id,
          attributes: m,
          ...(initialNamespaces ? { initialNamespaces } : {}),
        };
      })
    );
  }

  async function getAllTrainedModelObjectsForAllSpaces(modelIds?: string[]) {
    await isMlReady();
    const searchFields = ['model_id'];
    let filter = '';

    if (modelIds !== undefined && modelIds.length) {
      filter = modelIds
        .map((m) => `${ML_TRAINED_MODEL_SAVED_OBJECT_TYPE}.attributes.model_id: "${m}"`)
        .join(' OR ');
    }

    const options: SavedObjectsFindOptions = {
      type: ML_TRAINED_MODEL_SAVED_OBJECT_TYPE,
      perPage: 10000,
      ...(spacesEnabled === false ? {} : { namespaces: ['*'] }),
      searchFields,
      filter,
    };

    return (await internalSavedObjectsClient.find<TrainedModelObject>(options)).saved_objects;
  }

  async function _deleteTrainedModel(modelId: string) {
    const [model] = await _getTrainedModelObjects(modelId);
    if (model === undefined) {
      throw new MLModelNotFound('trained model not found');
    }

    await savedObjectsClient.delete(ML_TRAINED_MODEL_SAVED_OBJECT_TYPE, model.id, { force: true });
  }

  async function _forceDeleteTrainedModel(modelId: string, namespace: string) {
    // * space cannot be used in a delete call, so use undefined which
    // is the same as specifying the default space
    await internalSavedObjectsClient.delete(ML_TRAINED_MODEL_SAVED_OBJECT_TYPE, modelId, {
      namespace: namespace === '*' ? undefined : namespace,
      force: true,
    });
  }

  async function filterTrainedModelsForSpace<T>(list: T[], field: keyof T): Promise<T[]> {
    return _filterModelObjectsForSpace<T>(list, field, 'model_id');
  }

  async function filterTrainedModelIdsForSpace(
    ids: string[],
    allowWildcards: boolean = false
  ): Promise<string[]> {
    return _filterModelObjectIdsForSpace(ids, 'model_id', allowWildcards);
  }

  async function _filterModelObjectIdsForSpace(
    ids: string[],
    key: keyof TrainedModelObject,
    allowWildcards: boolean = false
  ): Promise<string[]> {
    if (ids.length === 0) {
      return [];
    }

    const modelIds = await _getModelIds(key);
    // check to see if any of the ids supplied contain a wildcard
    if (allowWildcards === false || ids.join().match('\\*') === null) {
      // wildcards are not allowed or no wildcards could be found
      return ids.filter((id) => modelIds.includes(id));
    }

    // if any of the ids contain a wildcard, check each one.
    return ids.filter((id) => {
      if (id.match('\\*') === null) {
        return modelIds.includes(id);
      }
      const regex = new RE2(id.replace('*', '.*'));
      return modelIds.some((jId) => typeof jId === 'string' && regex.exec(jId));
    });
  }

  async function _filterModelObjectsForSpace<T>(
    list: T[],
    field: keyof T,
    key: keyof TrainedModelObject
  ): Promise<T[]> {
    if (list.length === 0) {
      return [];
    }
    const modelIds = await _getModelIds(key);
    return list.filter((j) => modelIds.includes(j[field] as unknown as string));
  }

  async function _getModelIds(idType: keyof TrainedModelObject) {
    const models = await _getTrainedModelObjects();
    return models.map((o) => o.attributes[idType]);
  }

  async function findTrainedModelsObjectForJobs(
    jobIds: string[],
    currentSpaceOnly: boolean = true
  ) {
    await isMlReady();
    const { data_frame_analytics: jobs } = await client.asInternalUser.ml.getDataFrameAnalytics({
      id: jobIds.join(','),
    });

    const searches = jobs.map((job) => {
      const createTime = job.create_time!;

      const filterObject = {
        'job.job_id': job.id,
        'job.create_time': createTime,
      } as TrainedModelObjectFilter;
      const { filter, searchFields } = createSavedObjectFilter(
        filterObject,
        ML_TRAINED_MODEL_SAVED_OBJECT_TYPE
      );

      const options: SavedObjectsFindOptions = {
        type: ML_TRAINED_MODEL_SAVED_OBJECT_TYPE,
        perPage: 10000,
        ...(spacesEnabled === false || currentSpaceOnly === true ? {} : { namespaces: ['*'] }),
        searchFields,
        filter,
      };
      return savedObjectsClient.find<TrainedModelObject>(options);
    });

    const finedResult = await Promise.all(searches);
    return finedResult.reduce((acc, cur) => {
      const savedObject = cur.saved_objects[0];
      if (savedObject) {
        const jobId = savedObject.attributes.job!.job_id;
        acc[jobId] = savedObject;
      }
      return acc;
    }, {} as Record<string, SavedObjectsFindResult<TrainedModelObject>>);
  }

  async function updateTrainedModelsSpaces(
    modelIds: string[],
    spacesToAdd: string[],
    spacesToRemove: string[]
  ): Promise<SavedObjectResult> {
    const type: TrainedModelType = 'trained-model';
    if (modelIds.length === 0 || (spacesToAdd.length === 0 && spacesToRemove.length === 0)) {
      return {};
    }
    const results: SavedObjectResult = {};
    const models = await _getTrainedModelObjects();
    const trainedModelObjectIdMap = new Map<string, string>();
    const objectsToUpdate: Array<{ type: string; id: string }> = [];

    for (const modelId of modelIds) {
      const model = models.find(({ attributes }) => attributes.model_id === modelId);
      if (model === undefined) {
        results[modelId] = {
          success: false,
          type,
          error: createTrainedModelError(modelId),
        };
      } else {
        trainedModelObjectIdMap.set(model.id, model.attributes.model_id);
        objectsToUpdate.push({ type: ML_TRAINED_MODEL_SAVED_OBJECT_TYPE, id: model.id });
      }
    }
    try {
      const updateResult = await savedObjectsClient.updateObjectsSpaces(
        objectsToUpdate,
        spacesToAdd,
        spacesToRemove
      );
      updateResult.objects.forEach(({ id: objectId, error }) => {
        const model = trainedModelObjectIdMap.get(objectId)!;
        if (error) {
          results[model] = {
            success: false,
            type,
            error: getSavedObjectClientError(error),
          };
        } else {
          results[model] = {
            success: true,
            type,
          };
        }
      });
    } catch (error) {
      // If the entire operation failed, return success: false for each job
      const clientError = getSavedObjectClientError(error);
      objectsToUpdate.forEach(({ id: objectId }) => {
        const modelId = trainedModelObjectIdMap.get(objectId)!;
        results[modelId] = {
          success: false,
          type,
          error: clientError,
        };
      });
    }

    return results;
  }

  return {
    getAllJobObjects,
    getJobObject,
    createAnomalyDetectionJob,
    createDataFrameAnalyticsJob,
    deleteAnomalyDetectionJob,
    forceDeleteAnomalyDetectionJob,
    deleteDataFrameAnalyticsJob,
    forceDeleteDataFrameAnalyticsJob,
    addDatafeed,
    deleteDatafeed,
    filterJobsForSpace,
    filterJobIdsForSpace,
    filterDatafeedsForSpace,
    filterDatafeedIdsForSpace,
    updateJobsSpaces,
    bulkCreateJobs,
    getAllJobObjectsForAllSpaces,
    canCreateGlobalMlSavedObjects,
    getTrainedModelObject,
    createTrainedModel,
    bulkCreateTrainedModel,
    deleteTrainedModel,
    forceDeleteTrainedModel,
    updateTrainedModelsSpaces,
    getAllTrainedModelObjects,
    getAllTrainedModelObjectsForAllSpaces,
    filterTrainedModelsForSpace,
    filterTrainedModelIdsForSpace,
    findTrainedModelsObjectForJobs,
  };
}

export function createJobError(id: string, key: keyof JobObject) {
  let reason = `'${id}' not found`;
  if (key === 'job_id') {
    reason = `No known job with id '${id}'`;
  } else if (key === 'datafeed_id') {
    reason = `No known datafeed with id '${id}'`;
  }

  return reason;
}

export function createTrainedModelError(id: string) {
  return `No known trained model with id '${id}'`;
}

function createSavedObjectFilter(
  filterObject: JobObjectFilter | TrainedModelObjectFilter,
  savedObjectType: string
) {
  const searchFields: string[] = [];
  const filter = Object.entries(filterObject)
    .map(([k, v]) => {
      searchFields.push(k);
      return `${savedObjectType}.attributes.${k}: "${v}"`;
    })
    .join(' AND ');
  return { filter, searchFields };
}
