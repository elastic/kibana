/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { IScopedClusterClient, KibanaRequest } from 'kibana/server';
import type { JobSavedObjectService } from './service';
import { JobType, DeleteJobCheckResponse } from '../../common/types/saved_objects';

import { DataFrameAnalyticsConfig } from '../../common/types/data_frame_analytics';
import { ResolveMlCapabilities } from '../../common/types/capabilities';
import { getJobDetailsFromModel } from './util';

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

export interface ModelSavedObjectStatus {
  modelId: string;
  namespaces: string[] | undefined;
  checks: {
    modelExists: boolean;
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

export interface ModelStatus {
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
    models: ModelSavedObjectStatus[];
  };
  jobs: {
    'anomaly-detector': JobStatus[];
    'data-frame-analytics': JobStatus[];
    models: ModelStatus[];
  };
}

export function checksFactory(
  client: IScopedClusterClient,
  jobSavedObjectService: JobSavedObjectService
) {
  async function checkStatus(): Promise<StatusResponse> {
    const jobObjects = await jobSavedObjectService.getAllJobObjects(undefined, false);
    const modelObjects = await jobSavedObjectService.getAllModelObjects(false);

    // load all non-space jobs and datafeeds
    const { body: adJobs } = await client.asInternalUser.ml.getJobs();
    const { body: datafeeds } = await client.asInternalUser.ml.getDatafeeds();
    const { body: dfaJobs } =
      (await client.asInternalUser.ml.getDataFrameAnalytics()) as unknown as {
        body: { data_frame_analytics: DataFrameAnalyticsConfig[] };
      };
    const { body: models } = await client.asInternalUser.ml.getTrainedModels();

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
      const job = getJobDetailsFromModel(cur);
      if (job === null) {
        return acc;
      }

      const { jobId, createTime } = job;
      const exists = createTime === dfaJobsCreateTimeMap.get(jobId);

      if (jobId && createTime) {
        acc.set(cur.model_id, exists);
      }
      return acc;
    }, new Map<string, boolean | null>());

    const modelSavedObjectsStatus: ModelSavedObjectStatus[] = modelObjects.map(
      ({ attributes, namespaces }) => {
        const modelId = attributes.model_id;

        const modelExists = models.trained_model_configs.some((m) => m.model_id === modelId);
        const dfaJobExists = modelJobExits.get(modelId) ?? null;

        return {
          modelId,
          namespaces,
          checks: {
            modelExists,
            dfaJobExists,
          },
        };
      }
    );

    const allJobObjects = await jobSavedObjectService.getAllJobObjectsForAllSpaces();
    const allModelObjects = await jobSavedObjectService.getAllModelObjectsForAllSpaces();

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
        // const jobId = metadata.
        const job = getJobDetailsFromModel(model);

        let savedObjectExits = false;
        let dfaJobReferenced = null;
        const modelObject = nonSpaceModelObjectIds.get(modelId);
        if (modelObject !== undefined) {
          savedObjectExits = true;
          if (job !== null) {
            dfaJobReferenced =
              modelObject.attributes.job?.job_id === job.jobId &&
              modelObject.attributes.job?.create_time === job.createTime;
          }
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
        models: modelSavedObjectsStatus,
      },
      jobs: {
        'anomaly-detector': anomalyDetectorsStatus,
        'data-frame-analytics': dataFrameAnalyticsStatus,
        models: modelsStatus,
      },
    };
  }

  async function canDeleteJobs(
    request: KibanaRequest,
    jobType: JobType,
    jobIds: string[],
    spacesEnabled: boolean,
    resolveMlCapabilities: ResolveMlCapabilities
  ) {
    if (jobType !== 'anomaly-detector' && jobType !== 'data-frame-analytics') {
      throw Boom.badRequest('Job type must be "anomaly-detector" or "data-frame-analytics"');
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
      return jobIds.reduce((results, jobId) => {
        results[jobId] = {
          canDelete: false,
          canRemoveFromSpace: false,
        };
        return results;
      }, {} as DeleteJobCheckResponse);
    }

    if (spacesEnabled === false) {
      // spaces are disabled, delete only no untagging
      return jobIds.reduce((results, jobId) => {
        results[jobId] = {
          canDelete: true,
          canRemoveFromSpace: false,
        };
        return results;
      }, {} as DeleteJobCheckResponse);
    }
    const canCreateGlobalJobs = await jobSavedObjectService.canCreateGlobalJobs(request);

    const jobObjects = await Promise.all(
      jobIds.map((id) => jobSavedObjectService.getJobObject(jobType, id))
    );

    return jobIds.reduce((results, jobId) => {
      const jobObject = jobObjects.find((j) => j?.attributes.job_id === jobId);
      if (jobObject === undefined || jobObject.namespaces === undefined) {
        // job saved object not found
        results[jobId] = {
          canDelete: false,
          canRemoveFromSpace: false,
        };
        return results;
      }

      const { namespaces } = jobObject;
      const isGlobalJob = namespaces.includes('*');

      // job is in * space, user can see all spaces - delete and no option to untag
      if (canCreateGlobalJobs && isGlobalJob) {
        results[jobId] = {
          canDelete: true,
          canRemoveFromSpace: false,
        };
        return results;
      }

      // job is in * space, user cannot see all spaces - no untagging, no deleting
      if (isGlobalJob) {
        results[jobId] = {
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
        results[jobId] = {
          canDelete: false,
          canRemoveFromSpace,
        };
        return results;
      }

      // job is individual spaces, user can see all of them - delete and option to untag
      results[jobId] = {
        canDelete: true,
        canRemoveFromSpace,
      };
      return results;
    }, {} as DeleteJobCheckResponse);
  }

  return { checkStatus, canDeleteJobs };
}
