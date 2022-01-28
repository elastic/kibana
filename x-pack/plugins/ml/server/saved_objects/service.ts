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
import {
  JobType,
  ML_JOB_SAVED_OBJECT_TYPE,
  ML_MODEL_SAVED_OBJECT_TYPE,
  MlSavedObjectType,
} from '../../common/types/saved_objects';
import { MLJobNotFound } from '../lib/ml_client';
import { getSavedObjectClientError } from './util';
import { authorizationProvider } from './authorization';

export interface JobObject {
  job_id: string;
  datafeed_id: string | null;
  type: JobType;
}
type JobObjectFilter = { [k in keyof JobObject]?: string };

export interface ModelObject {
  model_id: string;
  job: null | ModelJob;
}

export interface ModelJob {
  job_id: string;
  create_time: number;
}

type ModelObjectFilter = { [k in keyof ModelObject]?: string };

export type JobSavedObjectService = ReturnType<typeof jobSavedObjectServiceFactory>;

type UpdateJobsSpacesResult = Record<
  string,
  { success: boolean; type: MlSavedObjectType; error?: any }
>;

export function jobSavedObjectServiceFactory(
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

  // CHANGE!!!!!!!!!! this looks like a dupe of _getJobObjects
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
  ): Promise<UpdateJobsSpacesResult> {
    if (jobIds.length === 0 || (spacesToAdd.length === 0 && spacesToRemove.length === 0)) {
      return {};
    }

    const results: UpdateJobsSpacesResult = {};
    const jobs = await _getJobObjects(jobType);
    const jobObjectIdMap = new Map<string, string>();
    const jobObjectsToUpdate: Array<{ type: string; id: string }> = [];

    for (const jobId of jobIds) {
      const job = jobs.find((j) => j.attributes.job_id === jobId);
      if (job === undefined) {
        results[jobId] = {
          success: false,
          type: ML_JOB_SAVED_OBJECT_TYPE,
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
            type: ML_JOB_SAVED_OBJECT_TYPE,
            error: getSavedObjectClientError(error),
          };
        } else {
          results[jobId] = {
            success: true,
            type: ML_JOB_SAVED_OBJECT_TYPE,
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
          type: ML_JOB_SAVED_OBJECT_TYPE,
          error: clientError,
        };
      });
    }

    return { ...results };
  }

  async function canCreateGlobalJobs(request: KibanaRequest) {
    if (authorization === undefined) {
      return true;
    }
    const { authorizationCheck } = authorizationProvider(authorization);
    return (await authorizationCheck(request)).canCreateGlobally;
  }

  async function getModelObject(
    modelId: string,
    currentSpaceOnly: boolean = true
  ): Promise<SavedObjectsFindResult<ModelObject> | undefined> {
    const [modelObject] = await _getModelObjects(modelId, currentSpaceOnly);
    return modelObject;
  }

  async function createModel(modelId: string, job: ModelJob | null, namespaces?: []) {
    await _createModel(modelId, job, namespaces);
  }

  async function bulkCreateModel(models: ModelObject[], namespaceFallback?: string) {
    return await _bulkCreateModel(models, namespaceFallback);
  }

  async function deleteModel(modelId: string) {
    await _deleteModel(modelId);
  }

  async function forceDeleteModel(modelId: string, namespace: string) {
    await _forceDeleteModel(modelId, namespace);
  }

  async function getAllModelObjects(currentSpaceOnly: boolean = true) {
    return await _getModelObjects(undefined, currentSpaceOnly);
  }

  // async function bulkCreateModels(jobs: Array<{ job: JobObject; namespaces: string[] }>) {
  //   return await _bulkCreateJobs(jobs);
  // }

  async function _getModelObjects(modelId?: string, currentSpaceOnly: boolean = true) {
    await isMlReady();
    const filterObject: ModelObjectFilter = {};

    if (modelId !== undefined) {
      filterObject.model_id = modelId;
    }

    const { filter, searchFields } = createSavedObjectFilter(
      filterObject,
      ML_MODEL_SAVED_OBJECT_TYPE
    );

    const options: SavedObjectsFindOptions = {
      type: ML_MODEL_SAVED_OBJECT_TYPE,
      perPage: 10000,
      ...(spacesEnabled === false || currentSpaceOnly === true ? {} : { namespaces: ['*'] }),
      searchFields,
      filter,
    };

    const models = await savedObjectsClient.find<ModelObject>(options);

    return models.saved_objects;
  }

  async function _createModel(modelId: string, job: ModelJob | null, namespaces?: []) {
    await isMlReady();

    const modelObject: ModelObject = {
      model_id: modelId,
      job,
    };

    try {
      const [existingModelObject] = await getAllModelObjectsForAllSpaces([modelId]);
      if (existingModelObject !== undefined) {
        // a saved object for this job already exists, this may be left over from a previously deleted job
        if (existingModelObject.namespaces?.length) {
          // use a force delete just in case the saved object exists only in another space.
          await _forceDeleteModel(modelId, existingModelObject.namespaces[0]);
        } else {
          // the saved object has no spaces, this is unexpected, attempt a normal delete
          await savedObjectsClient.delete(ML_MODEL_SAVED_OBJECT_TYPE, modelId, { force: true });
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

    await savedObjectsClient.create<ModelObject>(ML_MODEL_SAVED_OBJECT_TYPE, modelObject, {
      id: modelId,
      ...(initialNamespaces ? { initialNamespaces } : {}),
    });
  }

  async function _bulkCreateModel(models: ModelObject[], namespaceFallback?: string) {
    await isMlReady();

    const namespacesPerJob = (await getAllJobObjectsForAllSpaces()).reduce((acc, cur) => {
      acc[cur.attributes.job_id] = cur.namespaces;
      return acc;
    }, {} as Record<string, string[] | undefined>);

    return await savedObjectsClient.bulkCreate<ModelObject>(
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
          type: ML_MODEL_SAVED_OBJECT_TYPE,
          id: m.model_id,
          attributes: m,
          ...(initialNamespaces ? { initialNamespaces } : {}),
        };
      })
    );
  }

  async function getAllModelObjectsForAllSpaces(modelIds?: string[]) {
    await isMlReady();
    const searchFields = ['model_id'];
    let filter = '';

    if (modelIds !== undefined && modelIds.length) {
      filter = modelIds
        .map((m) => `${ML_MODEL_SAVED_OBJECT_TYPE}.attributes.model_id: "${m}"`)
        .join(' OR ');
    }

    // const { filter searchFields } = createSavedObjectFilter(
    //   filterObject,
    //   ML_MODEL_SAVED_OBJECT_TYPE
    // );
    const options: SavedObjectsFindOptions = {
      type: ML_MODEL_SAVED_OBJECT_TYPE,
      perPage: 10000,
      ...(spacesEnabled === false ? {} : { namespaces: ['*'] }),
      searchFields,
      filter,
    };

    return (await internalSavedObjectsClient.find<ModelObject>(options)).saved_objects;
  }

  async function _deleteModel(modelId: string) {
    const [model] = await _getModelObjects(modelId);
    if (model === undefined) {
      throw new MLJobNotFound('job not found');
    }

    await savedObjectsClient.delete(ML_MODEL_SAVED_OBJECT_TYPE, model.id, { force: true });
  }

  async function _forceDeleteModel(modelId: string, namespace: string) {
    // const id = _jobSavedObjectId({
    //   model_id: modelId,
    // });

    // * space cannot be used in a delete call, so use undefined which
    // is the same as specifying the default space
    await internalSavedObjectsClient.delete(ML_MODEL_SAVED_OBJECT_TYPE, modelId, {
      namespace: namespace === '*' ? undefined : namespace,
      force: true,
    });
  }

  async function filterModelsForSpace<T>(list: T[], field: keyof T): Promise<T[]> {
    return _filterModelObjectsForSpace<T>(list, field, 'model_id');
  }

  async function filterModelIdsForSpace(
    ids: string[],
    allowWildcards: boolean = false
  ): Promise<string[]> {
    return _filterModelObjectIdsForSpace(ids, 'model_id', allowWildcards);
  }

  async function _filterModelObjectIdsForSpace(
    ids: string[],
    key: keyof ModelObject,
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
    key: keyof ModelObject
  ): Promise<T[]> {
    if (list.length === 0) {
      return [];
    }
    const modelIds = await _getModelIds(key);
    return list.filter((j) => modelIds.includes(j[field] as unknown as string));
  }

  async function _getModelIds(idType: keyof ModelObject) {
    const models = await _getModelObjects();
    return models.map((o) => o.attributes[idType]);
  }

  async function findModelsObjectForJobs(jobIds: string[], currentSpaceOnly: boolean = true) {
    await isMlReady();
    const {
      body: { data_frame_analytics: jobs },
    } = await client.asInternalUser.ml.getDataFrameAnalytics({ id: jobIds.join(',') });

    const searches = jobs.map((job) => {
      const createTime = job.create_time!;

      const filterObject = {
        'job.job_id': job.id,
        'job.create_time': createTime,
      } as ModelObjectFilter;
      const { filter, searchFields } = createSavedObjectFilter(
        filterObject,
        ML_MODEL_SAVED_OBJECT_TYPE
      );

      const options: SavedObjectsFindOptions = {
        type: ML_MODEL_SAVED_OBJECT_TYPE,
        perPage: 10000,
        ...(spacesEnabled === false || currentSpaceOnly === true ? {} : { namespaces: ['*'] }),
        searchFields,
        filter,
      };
      return savedObjectsClient.find<ModelObject>(options);
    });

    const finedResult = await Promise.all(searches);
    return finedResult.reduce((acc, cur) => {
      const so = cur.saved_objects[0];
      if (so) {
        const jobId = so.attributes.job!.job_id;
        acc[jobId] = so;
      }
      return acc;
    }, {} as Record<string, SavedObjectsFindResult<ModelObject>>);
  }

  async function updateModelsSpaces(
    modelIds: string[],
    spacesToAdd: string[],
    spacesToRemove: string[]
  ): Promise<UpdateJobsSpacesResult> {
    if (modelIds.length === 0 || (spacesToAdd.length === 0 && spacesToRemove.length === 0)) {
      return {};
    }
    const results: UpdateJobsSpacesResult = {};
    const models = await _getModelObjects();
    const modelObjectIdMap = new Map<string, string>();
    const objectsToUpdate: Array<{ type: string; id: string }> = [];

    for (const modelId of modelIds) {
      const model = models.find(({ attributes }) => attributes.model_id === modelId);
      if (model === undefined) {
        results[modelId] = {
          success: false,
          type: ML_MODEL_SAVED_OBJECT_TYPE,
          error: createModelError(modelId),
        };
      } else {
        modelObjectIdMap.set(model.id, model.attributes.model_id);
        objectsToUpdate.push({ type: ML_MODEL_SAVED_OBJECT_TYPE, id: model.id });
      }
    }
    try {
      const updateResult = await savedObjectsClient.updateObjectsSpaces(
        objectsToUpdate,
        spacesToAdd,
        spacesToRemove
      );
      updateResult.objects.forEach(({ id: objectId, error }) => {
        const model = modelObjectIdMap.get(objectId)!;
        if (error) {
          results[model] = {
            success: false,
            type: ML_MODEL_SAVED_OBJECT_TYPE,
            error: getSavedObjectClientError(error),
          };
        } else {
          results[model] = {
            success: true,
            type: ML_MODEL_SAVED_OBJECT_TYPE,
          };
        }
      });
    } catch (error) {
      // If the entire operation failed, return success: false for each job
      const clientError = getSavedObjectClientError(error);
      objectsToUpdate.forEach(({ id: objectId }) => {
        const modelId = modelObjectIdMap.get(objectId)!;
        results[modelId] = {
          success: false,
          type: ML_MODEL_SAVED_OBJECT_TYPE,
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
    canCreateGlobalJobs,
    getModelObject,
    createModel,
    bulkCreateModel,
    deleteModel,
    forceDeleteModel,
    updateModelsSpaces,
    getAllModelObjects,
    getAllModelObjectsForAllSpaces,
    filterModelsForSpace,
    filterModelIdsForSpace,
    findModelsObjectForJobs,
  };
}

export function createJobError(id: string, key: keyof JobObject) {
  let reason = `'${id}' not found`;
  if (key === 'job_id') {
    reason = `No known job with id '${id}'`;
  } else if (key === 'datafeed_id') {
    reason = `No known datafeed with id '${id}'`;
  }

  return {
    error: {
      reason,
    },
    status: 404,
  };
}

export function createModelError(id: string) {
  return {
    error: {
      reason: `No known model with id '${id}'`,
    },
    status: 404,
  };
}

function createSavedObjectFilter(
  filterObject: JobObjectFilter | ModelObjectFilter,
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
