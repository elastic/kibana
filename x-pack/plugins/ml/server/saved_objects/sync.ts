/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type { IScopedClusterClient } from 'kibana/server';
import type { JobObject, JobSavedObjectService, TrainedModelObject } from './service';
import type {
  JobType,
  TrainedModelType,
  SyncSavedObjectResponse,
  InitializeSavedObjectResponse,
} from '../../common/types/saved_objects';
import { checksFactory } from './checks';
import type { JobStatus } from './checks';
import { getSavedObjectClientError, getJobDetailsFromTrainedModel } from './util';

export interface JobSpaceOverrides {
  overrides: {
    [type in JobType]: { [jobId: string]: string[] };
  };
}

export function syncSavedObjectsFactory(
  client: IScopedClusterClient,
  jobSavedObjectService: JobSavedObjectService
) {
  const { checkStatus } = checksFactory(client, jobSavedObjectService);

  async function syncSavedObjects(simulate: boolean = false) {
    const results: SyncSavedObjectResponse = {
      savedObjectsCreated: {},
      savedObjectsDeleted: {},
      datafeedsAdded: {},
      datafeedsRemoved: {},
    };

    const [datafeeds, models, status] = await Promise.all([
      client.asInternalUser.ml.getDatafeeds(),
      client.asInternalUser.ml.getTrainedModels(),
      checkStatus(),
    ]);

    const tasks: Array<() => Promise<void>> = [];

    const adJobsById = status.jobs['anomaly-detector'].reduce((acc, j) => {
      acc[j.jobId] = j;
      return acc;
    }, {} as Record<string, JobStatus>);

    for (const job of status.jobs['anomaly-detector']) {
      if (job.checks.savedObjectExits === false) {
        const type = 'anomaly-detector';
        if (results.savedObjectsCreated[type] === undefined) {
          results.savedObjectsCreated[type] = {};
        }
        if (simulate === true) {
          results.savedObjectsCreated[type]![job.jobId] = { success: true };
        } else {
          // create AD saved objects for jobs which are missing them
          const jobId = job.jobId;
          const datafeedId = job.datafeedId;
          tasks.push(async () => {
            try {
              await jobSavedObjectService.createAnomalyDetectionJob(jobId, datafeedId ?? undefined);
              results.savedObjectsCreated[type]![job.jobId] = { success: true };
            } catch (error) {
              results.savedObjectsCreated[type]![job.jobId] = {
                success: false,

                error: getSavedObjectClientError(error),
              };
            }
          });
        }
      }
    }
    for (const job of status.jobs['data-frame-analytics']) {
      if (job.checks.savedObjectExits === false) {
        const type = 'data-frame-analytics';
        if (results.savedObjectsCreated[type] === undefined) {
          results.savedObjectsCreated[type] = {};
        }
        if (simulate === true) {
          results.savedObjectsCreated[type]![job.jobId] = { success: true };
        } else {
          // create DFA saved objects for jobs which are missing them
          const jobId = job.jobId;
          tasks.push(async () => {
            try {
              await jobSavedObjectService.createDataFrameAnalyticsJob(jobId);
              results.savedObjectsCreated[type]![job.jobId] = {
                success: true,
              };
            } catch (error) {
              results.savedObjectsCreated[type]![job.jobId] = {
                success: false,

                error: getSavedObjectClientError(error),
              };
            }
          });
        }
      }
    }

    for (const model of status.jobs['trained-model']) {
      if (model.checks.savedObjectExits === false) {
        const { modelId } = model;
        const type = 'trained-model';
        if (results.savedObjectsCreated[type] === undefined) {
          results.savedObjectsCreated[type] = {};
        }
        if (simulate === true) {
          results.savedObjectsCreated[type]![modelId] = { success: true };
        } else {
          // create model saved objects for models which are missing them
          tasks.push(async () => {
            try {
              const mod = models.trained_model_configs.find((m) => m.model_id === modelId);
              if (mod === undefined) {
                results.savedObjectsCreated[type]![modelId] = {
                  success: false,
                  error: `trained model ${modelId} not found`,
                };
                return;
              }
              const job = getJobDetailsFromTrainedModel(mod);
              await jobSavedObjectService.createTrainedModel(modelId, job);
              results.savedObjectsCreated[type]![modelId] = {
                success: true,
              };
            } catch (error) {
              results.savedObjectsCreated[type]![modelId] = {
                success: false,

                error: getSavedObjectClientError(error),
              };
            }
          });
        }
      }
    }

    for (const job of status.savedObjects['anomaly-detector']) {
      if (job.checks.jobExists === false) {
        const type = 'anomaly-detector';
        if (results.savedObjectsDeleted[type] === undefined) {
          results.savedObjectsDeleted[type] = {};
        }
        if (simulate === true) {
          results.savedObjectsDeleted[type]![job.jobId] = { success: true };
        } else {
          // Delete AD saved objects for jobs which no longer exist
          const { jobId, namespaces } = job;
          tasks.push(async () => {
            try {
              if (namespaces !== undefined && namespaces.length) {
                await jobSavedObjectService.forceDeleteAnomalyDetectionJob(jobId, namespaces[0]);
              } else {
                await jobSavedObjectService.deleteAnomalyDetectionJob(jobId);
              }
              results.savedObjectsDeleted[type]![job.jobId] = { success: true };
            } catch (error) {
              results.savedObjectsDeleted[type]![job.jobId] = {
                success: false,

                error: getSavedObjectClientError(error),
              };
            }
          });
        }
      }
    }
    for (const job of status.savedObjects['data-frame-analytics']) {
      if (job.checks.jobExists === false) {
        const type = 'data-frame-analytics';
        if (results.savedObjectsDeleted[type] === undefined) {
          results.savedObjectsDeleted[type] = {};
        }
        if (simulate === true) {
          results.savedObjectsDeleted[type]![job.jobId] = { success: true };
        } else {
          // Delete DFA saved objects for jobs which no longer exist
          const { jobId, namespaces } = job;
          tasks.push(async () => {
            try {
              if (namespaces !== undefined && namespaces.length) {
                await jobSavedObjectService.forceDeleteDataFrameAnalyticsJob(jobId, namespaces[0]);
              } else {
                await jobSavedObjectService.deleteDataFrameAnalyticsJob(jobId);
              }
              results.savedObjectsDeleted[type]![job.jobId] = {
                success: true,
              };
            } catch (error) {
              results.savedObjectsDeleted[type]![job.jobId] = {
                success: false,

                error: getSavedObjectClientError(error),
              };
            }
          });
        }
      }
    }

    for (const model of status.savedObjects['trained-model']) {
      if (model.checks.trainedModelExists === false) {
        const { modelId, namespaces } = model;
        const type = 'trained-model';
        if (results.savedObjectsDeleted[type] === undefined) {
          results.savedObjectsDeleted[type] = {};
        }

        if (simulate === true) {
          results.savedObjectsDeleted[type]![modelId] = { success: true };
        } else {
          // Delete model saved objects for models which no longer exist
          tasks.push(async () => {
            try {
              if (namespaces !== undefined && namespaces.length) {
                await jobSavedObjectService.forceDeleteTrainedModel(modelId, namespaces[0]);
              } else {
                await jobSavedObjectService.deleteTrainedModel(modelId);
              }
              results.savedObjectsDeleted[type]![modelId] = {
                success: true,
              };
            } catch (error) {
              results.savedObjectsDeleted[type]![modelId] = {
                success: false,

                error: getSavedObjectClientError(error),
              };
            }
          });
        }
      }
    }

    for (const job of status.savedObjects['anomaly-detector']) {
      const type = 'anomaly-detector';
      if (
        (job.checks.datafeedExists === true && job.datafeedId === null) ||
        (job.checks.datafeedExists === true &&
          job.datafeedId !== null &&
          adJobsById[job.jobId] &&
          adJobsById[job.jobId].datafeedId !== job.datafeedId)
      ) {
        if (results.datafeedsAdded[type] === undefined) {
          results.datafeedsAdded[type] = {};
        }
        // add datafeed id for jobs where the datafeed exists but the id is missing from the saved object
        // or if the datafeed id in the saved object is not the same as the one attached to the job in es
        if (simulate === true) {
          results.datafeedsAdded[type]![job.jobId] = { success: true };
        } else {
          const df = datafeeds.datafeeds.find((d) => d.job_id === job.jobId);
          const jobId = job.jobId;
          const datafeedId = df?.datafeed_id;

          tasks.push(async () => {
            try {
              if (datafeedId !== undefined) {
                await jobSavedObjectService.addDatafeed(datafeedId, jobId);
              }
              results.datafeedsAdded[type]![job.jobId] = { success: true };
            } catch (error) {
              results.datafeedsAdded[type]![job.jobId] = {
                success: false,

                error: getSavedObjectClientError(error),
              };
            }
          });
        }
      } else if (
        job.checks.jobExists === true &&
        job.checks.datafeedExists === false &&
        job.datafeedId !== null &&
        job.datafeedId !== undefined
      ) {
        if (results.datafeedsRemoved[type] === undefined) {
          results.datafeedsRemoved[type] = {};
        }
        // remove datafeed id for jobs where the datafeed no longer exists but the id is populated in the saved object
        if (simulate === true) {
          results.datafeedsRemoved[type]![job.jobId] = { success: true };
        } else {
          const datafeedId = job.datafeedId;
          tasks.push(async () => {
            try {
              await jobSavedObjectService.deleteDatafeed(datafeedId);
              results.datafeedsRemoved[type]![job.jobId] = { success: true };
            } catch (error) {
              results.datafeedsRemoved[type]![job.jobId] = {
                success: false,

                error: getSavedObjectClientError(error),
              };
            }
          });
        }
      }
    }
    await Promise.allSettled(tasks.map((t) => t()));
    return results;
  }

  async function initSavedObjects(
    simulate: boolean = false,
    spaceOverrides?: JobSpaceOverrides
  ): Promise<InitializeSavedObjectResponse> {
    const results: InitializeSavedObjectResponse = {
      jobs: [],
      datafeeds: [],
      trainedModels: [],
      success: true,
    };
    const status = await checkStatus();
    const adJobsById = status.jobs['anomaly-detector'].reduce((acc, j) => {
      acc[j.jobId] = j;
      return acc;
    }, {} as Record<string, JobStatus>);

    const jobObjects: Array<{ job: JobObject; namespaces: string[] }> = [];
    const datafeeds: Array<{ jobId: string; datafeedId: string }> = [];
    const types: JobType[] = ['anomaly-detector', 'data-frame-analytics'];

    types.forEach((type) => {
      status.jobs[type].forEach((job) => {
        if (job.checks.savedObjectExits === false) {
          if (simulate === true) {
            results.jobs.push({ id: job.jobId, type });
          } else {
            jobObjects.push({
              job: {
                job_id: job.jobId,
                datafeed_id: job.datafeedId ?? null,
                type,
              },
              // allow some jobs to be assigned to specific spaces when initializing
              namespaces: spaceOverrides?.overrides[type]![job.jobId] ?? ['*'],
            });
          }
        }
      });
    });

    status.savedObjects['anomaly-detector'].forEach((job) => {
      const type = 'anomaly-detector';
      const datafeedId = adJobsById[job.jobId]?.datafeedId;
      if (!datafeedId) {
        return;
      }

      if (
        job.checks.datafeedExists === true &&
        (job.datafeedId === null ||
          (job.datafeedId !== null &&
            adJobsById[job.jobId] &&
            adJobsById[job.jobId].datafeedId !== job.datafeedId))
      ) {
        if (simulate === true) {
          results.datafeeds.push({ id: datafeedId, type });
        } else {
          datafeeds.push({
            jobId: job.jobId,
            datafeedId,
          });
        }
      }
    });

    const models = status.jobs['trained-model'].filter(
      ({ checks }) => checks.savedObjectExits === false
    );
    const modelObjects: TrainedModelObject[] = [];

    if (models.length) {
      if (simulate === true) {
        results.trainedModels = models.map(({ modelId }) => ({ id: modelId }));
      } else {
        const { trained_model_configs: trainedModelConfigs } =
          await client.asInternalUser.ml.getTrainedModels({
            model_id: models.map(({ modelId }) => modelId).join(','),
          });
        const jobDetails = trainedModelConfigs.reduce((acc, cur) => {
          const job = getJobDetailsFromTrainedModel(cur);
          if (job !== null) {
            acc[cur.model_id] = job;
          }
          return acc;
        }, {} as Record<string, TrainedModelObject['job']>);

        models.forEach(({ modelId }) => {
          modelObjects.push({
            model_id: modelId,
            job: jobDetails[modelId] ? jobDetails[modelId] : null,
          });
        });
      }
    }

    try {
      // create missing job saved objects
      const createJobsResults = await jobSavedObjectService.bulkCreateJobs(jobObjects);
      createJobsResults.saved_objects.forEach(({ attributes }) => {
        results.jobs.push({
          id: attributes.job_id,
          type: attributes.type,
        });
      });

      //  create missing datafeed ids
      for (const { jobId, datafeedId } of datafeeds) {
        await jobSavedObjectService.addDatafeed(datafeedId, jobId);
        results.datafeeds.push({
          id: datafeedId,
          type: 'anomaly-detector',
        });
      }

      // use * space if no spaces for related jobs can be found.
      const createModelsResults = await jobSavedObjectService.bulkCreateTrainedModel(
        modelObjects,
        '*'
      );
      createModelsResults.saved_objects.forEach(({ attributes }) => {
        results.trainedModels.push({
          id: attributes.model_id,
        });
      });
    } catch (error) {
      results.success = false;
      results.error = Boom.boomify(error);
    }

    return results;
  }

  async function isSyncNeeded(jobType?: JobType | TrainedModelType) {
    const { jobs, datafeeds, trainedModels } = await initSavedObjects(true);
    const missingJobs =
      jobs.length > 0 && (jobType === undefined || jobs.some(({ type }) => type === jobType));

    const missingModels =
      trainedModels.length > 0 && (jobType === undefined || jobType === 'trained-model');

    const missingDatafeeds = datafeeds.length > 0 && jobType !== 'data-frame-analytics';

    return missingJobs || missingModels || missingDatafeeds;
  }

  return { checkStatus, syncSavedObjects, initSavedObjects, isSyncNeeded };
}
