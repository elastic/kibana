/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { IScopedClusterClient } from 'kibana/server';
import { JobSavedObjectService } from '../../saved_objects';
import { getJobDetailsFromTrainedModel } from '../../saved_objects/util';
import { JobType } from '../../../common/types/saved_objects';

import { Job, Datafeed } from '../../../common/types/anomaly_detection_jobs';
import { searchProvider } from './search';

import { DataFrameAnalyticsConfig } from '../../../common/types/data_frame_analytics';
import { MLJobNotFound, MLModelNotFound } from './errors';
import {
  MlClient,
  MlClientParams,
  MlGetADParams,
  MlGetDFAParams,
  MlGetDatafeedParams,
  MlGetTrainedModelParams,
} from './types';

export function getMlClient(
  client: IScopedClusterClient,
  jobSavedObjectService: JobSavedObjectService
): MlClient {
  const mlClient = client.asInternalUser.ml;

  async function jobIdsCheck(jobType: JobType, p: MlClientParams, allowWildcards: boolean = false) {
    const jobIds =
      jobType === 'anomaly-detector' ? getADJobIdsFromRequest(p) : getDFAJobIdsFromRequest(p);
    if (jobIds.length) {
      await checkJobIds(jobType, jobIds, allowWildcards);
    }
  }

  async function checkJobIds(jobType: JobType, jobIds: string[], allowWildcards: boolean = false) {
    const filteredJobIds = await jobSavedObjectService.filterJobIdsForSpace(jobType, jobIds);
    let missingIds = jobIds.filter((j) => filteredJobIds.indexOf(j) === -1);
    if (allowWildcards === true && missingIds.join().match('\\*') !== null) {
      // filter out wildcard ids from the error
      missingIds = missingIds.filter((id) => id.match('\\*') === null);
    }
    if (missingIds.length) {
      throw new MLJobNotFound(`No known job with id '${missingIds.join(',')}'`);
    }
  }

  async function groupIdsCheck(p: MlClientParams, allJobs: Job[], filteredJobIds: string[]) {
    // if job ids have been specified, we need to check in case any of them are actually
    // group ids, which will be unknown to the saved objects.
    // find which ids are not group ids and check them.
    const ids = getADJobIdsFromRequest(p);
    if (ids.length) {
      // find all groups from unfiltered jobs
      const responseGroupIds = [...new Set(allJobs.map((j) => j.groups ?? []).flat())];

      // work out which ids requested are actually groups and which are jobs
      const requestedGroupIds: string[] = [];
      const requestedJobIds: string[] = [];
      ids.forEach((id) => {
        if (responseGroupIds.includes(id)) {
          requestedGroupIds.push(id);
        } else {
          requestedJobIds.push(id);
        }
      });

      // find all groups from filtered jobs
      const groupIdsFromFilteredJobs = [
        ...new Set(
          allJobs
            .filter((j) => filteredJobIds.includes(j.job_id))
            .map((j) => j.groups ?? [])
            .flat()
        ),
      ];

      const groupsIdsThatDidNotMatch = requestedGroupIds.filter(
        (id) => groupIdsFromFilteredJobs.includes(id) === false
      );

      if (groupsIdsThatDidNotMatch.length) {
        // if there are group ids which were requested but didn't
        // exist in filtered jobs, list them in an error
        throw new MLJobNotFound(`No known job with id '${groupsIdsThatDidNotMatch.join(',')}'`);
      }

      // check the remaining jobs ids
      if (requestedJobIds.length) {
        await checkJobIds('anomaly-detector', requestedJobIds, true);
      }
    }
  }

  async function groupIdsCheckFromJobStats(
    filteredJobIds: string[],
    ...p: Parameters<MlClient['getJobStats']>
  ) {
    // similar to groupIdsCheck above, however we need to load the jobs first to get the groups information
    const ids = filterAll(getADJobIdsFromRequest(p));
    if (ids.length) {
      const body = await mlClient.getJobs(...p);
      await groupIdsCheck(p, body.jobs, filteredJobIds);
    }
  }

  async function datafeedIdsCheck(p: MlClientParams, allowWildcards: boolean = false) {
    const datafeedIds = getDatafeedIdsFromRequest(p);
    if (datafeedIds.length) {
      const filteredDatafeedIds = await jobSavedObjectService.filterDatafeedIdsForSpace(
        datafeedIds
      );
      let missingIds = datafeedIds.filter((j) => filteredDatafeedIds.indexOf(j) === -1);
      if (allowWildcards === true && missingIds.join().match('\\*') !== null) {
        // filter out wildcard ids from the error
        missingIds = missingIds.filter((id) => id.match('\\*') === null);
      }
      if (missingIds.length) {
        throw new MLJobNotFound(`No known datafeed with id '${missingIds.join(',')}'`);
      }
    }
  }

  async function modelIdsCheck(p: MlClientParams, allowWildcards: boolean = false) {
    const modelIds = filterAll(getModelIdsFromRequest(p));
    if (modelIds.length) {
      await checkModelIds(modelIds, allowWildcards);
    }
  }

  async function checkModelIds(modelIds: string[], allowWildcards: boolean = false) {
    const filteredModelIds = await jobSavedObjectService.filterTrainedModelIdsForSpace(modelIds);
    let missingIds = modelIds.filter((j) => filteredModelIds.indexOf(j) === -1);
    if (allowWildcards === true && missingIds.join().match('\\*') !== null) {
      // filter out wildcard ids from the error
      missingIds = missingIds.filter((id) => id.match('\\*') === null);
    }
    if (missingIds.length) {
      throw new MLModelNotFound(`No known model with id '${missingIds.join(',')}'`);
    }
  }

  // @ts-expect-error promise and TransportRequestPromise are incompatible. missing abort
  return {
    async closeJob(...p: Parameters<MlClient['closeJob']>) {
      await jobIdsCheck('anomaly-detector', p);
      return mlClient.closeJob(...p);
    },
    async deleteCalendar(...p: Parameters<MlClient['deleteCalendar']>) {
      return mlClient.deleteCalendar(...p);
    },
    async deleteCalendarEvent(...p: Parameters<MlClient['deleteCalendarEvent']>) {
      return mlClient.deleteCalendarEvent(...p);
    },
    async deleteCalendarJob(...p: Parameters<MlClient['deleteCalendarJob']>) {
      return mlClient.deleteCalendarJob(...p);
    },
    async deleteDataFrameAnalytics(...p: Parameters<MlClient['deleteDataFrameAnalytics']>) {
      await jobIdsCheck('data-frame-analytics', p);
      const resp = await mlClient.deleteDataFrameAnalytics(...p);
      // don't delete the job saved object as the real job will not be
      // deleted initially and could still fail.
      return resp;
    },
    async deleteDatafeed(...p: Parameters<MlClient['deleteDatafeed']>) {
      await datafeedIdsCheck(p);
      const resp = await mlClient.deleteDatafeed(...p);
      const [datafeedId] = getDatafeedIdsFromRequest(p);
      if (datafeedId !== undefined) {
        await jobSavedObjectService.deleteDatafeed(datafeedId);
      }
      return resp;
    },
    async deleteExpiredData(...p: Parameters<MlClient['deleteExpiredData']>) {
      await jobIdsCheck('anomaly-detector', p);
      return mlClient.deleteExpiredData(...p);
    },
    async deleteFilter(...p: Parameters<MlClient['deleteFilter']>) {
      return mlClient.deleteFilter(...p);
    },
    async deleteForecast(...p: Parameters<MlClient['deleteForecast']>) {
      await jobIdsCheck('anomaly-detector', p);
      return mlClient.deleteForecast(...p);
    },
    async deleteJob(...p: Parameters<MlClient['deleteJob']>) {
      await jobIdsCheck('anomaly-detector', p);
      const resp = await mlClient.deleteJob(...p);
      // don't delete the job saved object as the real job will not be
      // deleted initially and could still fail.
      return resp;
    },
    async deleteModelSnapshot(...p: Parameters<MlClient['deleteModelSnapshot']>) {
      await jobIdsCheck('anomaly-detector', p);
      return mlClient.deleteModelSnapshot(...p);
    },
    async deleteTrainedModel(...p: Parameters<MlClient['deleteTrainedModel']>) {
      await modelIdsCheck(p);
      return mlClient.deleteTrainedModel(...p);
    },
    async estimateModelMemory(...p: Parameters<MlClient['estimateModelMemory']>) {
      return mlClient.estimateModelMemory(...p);
    },
    async evaluateDataFrame(...p: Parameters<MlClient['evaluateDataFrame']>) {
      return mlClient.evaluateDataFrame(...p);
    },
    async explainDataFrameAnalytics(...p: Parameters<MlClient['explainDataFrameAnalytics']>) {
      await jobIdsCheck('data-frame-analytics', p);
      return mlClient.explainDataFrameAnalytics(...p);
    },
    async flushJob(...p: Parameters<MlClient['flushJob']>) {
      await jobIdsCheck('anomaly-detector', p);
      return mlClient.flushJob(...p);
    },
    async forecast(...p: Parameters<MlClient['forecast']>) {
      await jobIdsCheck('anomaly-detector', p);
      return mlClient.forecast(...p);
    },
    async getBuckets(...p: Parameters<MlClient['getBuckets']>) {
      await jobIdsCheck('anomaly-detector', p);
      return mlClient.getBuckets(...p);
    },
    async getCalendarEvents(...p: Parameters<MlClient['getCalendarEvents']>) {
      await jobIdsCheck('anomaly-detector', p);
      return mlClient.getCalendarEvents(...p);
    },
    async getCalendars(...p: Parameters<MlClient['getCalendars']>) {
      const [params, options = {}] = p;
      const meta = options.meta ?? false;
      const response = await mlClient.getCalendars(params, { ...options, meta: true });
      const { jobs: allJobs } = await mlClient.getJobs();
      const allJobIds = allJobs.map((j) => j.job_id);

      // flatten the list of all jobs ids and check which ones are valid
      const calJobIds = [...new Set(response.body.calendars.map((c) => c.job_ids).flat())];
      // find groups by getting the cal job ids which aren't real jobs.
      const groups = calJobIds.filter((j) => allJobIds.includes(j) === false);

      // get list of calendar jobs which are allowed in this space
      const filteredJobIds = await jobSavedObjectService.filterJobIdsForSpace(
        'anomaly-detector',
        calJobIds
      );
      const calendars = response.body.calendars.map((c) => ({
        ...c,
        job_ids: c.job_ids.filter((id) => filteredJobIds.includes(id) || groups.includes(id)),
        total_job_count: calJobIds.length,
      }));

      const enhancedBody = { ...response.body, calendars };

      if (meta) {
        return { ...response, body: enhancedBody };
      } else {
        return enhancedBody;
      }
    },
    async getCategories(...p: Parameters<MlClient['getCategories']>) {
      await jobIdsCheck('anomaly-detector', p);
      return mlClient.getCategories(...p);
    },
    async getDataFrameAnalytics(...p: Parameters<MlClient['getDataFrameAnalytics']>) {
      await jobIdsCheck('data-frame-analytics', p, true);
      try {
        const [params, options = {}] = p;
        const meta = options.meta ?? false;

        const response = await mlClient.getDataFrameAnalytics(params, { ...options, meta: true });
        const jobs = await jobSavedObjectService.filterJobsForSpace<DataFrameAnalyticsConfig>(
          'data-frame-analytics',
          // @ts-expect-error @elastic-elasticsearch Data frame types incomplete
          response.body.data_frame_analytics,
          'id'
        );

        const enhancedBody = { ...response.body, count: jobs.length, data_frame_analytics: jobs };
        if (meta) {
          return { ...response, body: enhancedBody };
        } else {
          return enhancedBody;
        }
      } catch (error) {
        if (error.statusCode === 404) {
          throw new MLJobNotFound(error.body.error.reason);
        }
        throw error.body ?? error;
      }
    },
    async getDataFrameAnalyticsStats(...p: Parameters<MlClient['getDataFrameAnalyticsStats']>) {
      // this should use DataFrameAnalyticsStats, but needs a refactor to move DataFrameAnalyticsStats to common
      await jobIdsCheck('data-frame-analytics', p, true);
      try {
        const [params, options = {}] = p;
        const meta = options.meta ?? false;
        const response = (await mlClient.getDataFrameAnalyticsStats(params, {
          ...options,
          meta: true,
        })) as unknown as {
          body: { data_frame_analytics: DataFrameAnalyticsConfig[] };
        };
        const jobs = await jobSavedObjectService.filterJobsForSpace<DataFrameAnalyticsConfig>(
          'data-frame-analytics',
          response.body.data_frame_analytics,
          'id'
        );

        const enhancedBody = { ...response.body, count: jobs.length, data_frame_analytics: jobs };
        if (meta) {
          return { ...response, body: enhancedBody };
        } else {
          return enhancedBody;
        }
      } catch (error) {
        if (error.statusCode === 404) {
          throw new MLJobNotFound(error.body.error.reason);
        }
        throw error.body ?? error;
      }
    },
    async getDatafeedStats(...p: Parameters<MlClient['getDatafeedStats']>) {
      await datafeedIdsCheck(p, true);
      try {
        const [params, options = {}] = p;
        const meta = options.meta ?? false;
        const response = await mlClient.getDatafeedStats(params, { ...options, meta: true });
        const datafeeds = await jobSavedObjectService.filterDatafeedsForSpace(
          'anomaly-detector',
          response.body.datafeeds,
          'datafeed_id'
        );

        const enhancedBody = { ...response.body, count: datafeeds.length, datafeeds };
        if (meta) {
          return { ...response, body: enhancedBody };
        } else {
          return enhancedBody;
        }
      } catch (error) {
        if (error.statusCode === 404) {
          throw new MLJobNotFound(error.body.error.reason);
        }
        throw error.body ?? error;
      }
    },
    async getDatafeeds(...p: Parameters<MlClient['getDatafeeds']>) {
      await datafeedIdsCheck(p, true);
      try {
        const [params, options = {}] = p;
        const meta = options.meta ?? false;
        const response = await mlClient.getDatafeeds(params, { ...options, meta: true });
        const datafeeds = await jobSavedObjectService.filterDatafeedsForSpace<Datafeed>(
          'anomaly-detector',
          response.body.datafeeds,
          'datafeed_id'
        );

        const enhancedBody = { ...response.body, count: datafeeds.length, datafeeds };
        if (meta) {
          return { ...response, body: enhancedBody };
        } else {
          return enhancedBody;
        }
      } catch (error) {
        if (error.statusCode === 404) {
          throw new MLJobNotFound(error.body.error.reason);
        }
        throw error.body ?? error;
      }
    },
    async getFilters(...p: Parameters<MlClient['getFilters']>) {
      return mlClient.getFilters(...p);
    },
    async getInfluencers(...p: Parameters<MlClient['getInfluencers']>) {
      await jobIdsCheck('anomaly-detector', p);
      return mlClient.getInfluencers(...p);
    },
    async getJobStats(...p: Parameters<MlClient['getJobStats']>) {
      try {
        const [params, options = {}] = p;
        const meta = options.meta ?? false;
        const response = await mlClient.getJobStats(params, { ...options, meta: true });
        const jobs = await jobSavedObjectService.filterJobsForSpace(
          'anomaly-detector',
          response.body.jobs,
          'job_id'
        );
        await groupIdsCheckFromJobStats(
          jobs.map((j) => j.job_id),
          ...p
        );

        const enhancedBody = { ...response.body, count: jobs.length, jobs };
        if (meta) {
          return { ...response, body: enhancedBody };
        } else {
          return enhancedBody;
        }
      } catch (error) {
        if (error instanceof MLJobNotFound) {
          throw error;
        }
        if (error.statusCode === 404) {
          throw new MLJobNotFound(error.body.error.reason);
        }
        throw error.body ?? error;
      }
    },
    async getJobs(...p: Parameters<MlClient['getJobs']>) {
      try {
        const [params, options = {}] = p;
        const meta = options.meta ?? false;
        const response = await mlClient.getJobs(params, { ...options, meta: true });
        const jobs = await jobSavedObjectService.filterJobsForSpace<Job>(
          'anomaly-detector',
          response.body.jobs,
          'job_id'
        );
        await groupIdsCheck(
          p,
          response.body.jobs,
          jobs.map((j) => j.job_id)
        );

        const enhancedBody = { ...response.body, count: jobs.length, jobs };
        if (meta) {
          return { ...response, body: enhancedBody };
        } else {
          return enhancedBody;
        }
      } catch (error) {
        if (error instanceof MLJobNotFound) {
          throw error;
        }
        if (error.statusCode === 404) {
          throw new MLJobNotFound(error.body.error.reason);
        }
        throw error.body ?? error;
      }
    },
    async getModelSnapshots(...p: Parameters<MlClient['getModelSnapshots']>) {
      await jobIdsCheck('anomaly-detector', p);
      return mlClient.getModelSnapshots(...p);
    },
    async getOverallBuckets(...p: Parameters<MlClient['getOverallBuckets']>) {
      await jobIdsCheck('anomaly-detector', p);
      return mlClient.getOverallBuckets(...p);
    },
    async getRecords(...p: Parameters<MlClient['getRecords']>) {
      await jobIdsCheck('anomaly-detector', p);
      return mlClient.getRecords(...p);
    },
    async getTrainedModels(...p: Parameters<MlClient['getTrainedModels']>) {
      await modelIdsCheck(p, true);
      try {
        const body = await mlClient.getTrainedModels(...p);
        const models =
          await jobSavedObjectService.filterTrainedModelsForSpace<estypes.MlTrainedModelConfig>(
            body.trained_model_configs,
            'model_id'
          );
        return { ...body, count: models.length, trained_model_configs: models };
      } catch (error) {
        if (error.statusCode === 404) {
          throw new MLModelNotFound(error.body.error.reason);
        }
        throw error.body ?? error;
      }
    },
    async getTrainedModelsStats(...p: Parameters<MlClient['getTrainedModelsStats']>) {
      await modelIdsCheck(p, true);
      try {
        const body = await mlClient.getTrainedModelsStats(...p);
        const models =
          await jobSavedObjectService.filterTrainedModelsForSpace<estypes.MlTrainedModelStats>(
            body.trained_model_stats,
            'model_id'
          );
        return { ...body, count: models.length, trained_model_stats: models };
      } catch (error) {
        if (error.statusCode === 404) {
          throw new MLModelNotFound(error.body.error.reason);
        }
        throw error.body ?? error;
      }
    },
    async startTrainedModelDeployment(...p: Parameters<MlClient['startTrainedModelDeployment']>) {
      await modelIdsCheck(p);
      return mlClient.startTrainedModelDeployment(...p);
    },
    async stopTrainedModelDeployment(...p: Parameters<MlClient['stopTrainedModelDeployment']>) {
      await modelIdsCheck(p);
      return mlClient.stopTrainedModelDeployment(...p);
    },
    async info(...p: Parameters<MlClient['info']>) {
      return mlClient.info(...p);
    },
    async openJob(...p: Parameters<MlClient['openJob']>) {
      await jobIdsCheck('anomaly-detector', p);
      return mlClient.openJob(...p);
    },
    async postCalendarEvents(...p: Parameters<MlClient['postCalendarEvents']>) {
      return mlClient.postCalendarEvents(...p);
    },
    async postData(...p: Parameters<MlClient['postData']>) {
      await jobIdsCheck('anomaly-detector', p);
      return mlClient.postData(...p);
    },
    async previewDatafeed(...p: Parameters<MlClient['previewDatafeed']>) {
      await datafeedIdsCheck(p);
      return mlClient.previewDatafeed(...p);
    },
    async putCalendar(...p: Parameters<MlClient['putCalendar']>) {
      return mlClient.putCalendar(...p);
    },
    async putCalendarJob(...p: Parameters<MlClient['putCalendarJob']>) {
      return mlClient.putCalendarJob(...p);
    },
    async putDataFrameAnalytics(...p: Parameters<MlClient['putDataFrameAnalytics']>) {
      const resp = await mlClient.putDataFrameAnalytics(...p);
      const [analyticsId] = getDFAJobIdsFromRequest(p);
      if (analyticsId !== undefined) {
        await jobSavedObjectService.createDataFrameAnalyticsJob(analyticsId);
      }
      return resp;
    },
    async putDatafeed(...p: Parameters<MlClient['putDatafeed']>) {
      const resp = await mlClient.putDatafeed(...p);
      const [datafeedId] = getDatafeedIdsFromRequest(p);
      const jobId = getJobIdFromBody(p);
      if (datafeedId !== undefined && jobId !== undefined) {
        await jobSavedObjectService.addDatafeed(datafeedId, jobId);
      }

      return resp;
    },
    async putFilter(...p: Parameters<MlClient['putFilter']>) {
      return mlClient.putFilter(...p);
    },
    async putJob(...p: Parameters<MlClient['putJob']>) {
      const resp = await mlClient.putJob(...p);
      const [jobId] = getADJobIdsFromRequest(p);
      if (jobId !== undefined) {
        await jobSavedObjectService.createAnomalyDetectionJob(jobId);
      }
      return resp;
    },
    async putTrainedModel(...p: Parameters<MlClient['putTrainedModel']>) {
      const resp = await mlClient.putTrainedModel(...p);
      const [modelId] = getModelIdsFromRequest(p);
      if (modelId !== undefined) {
        const model = (p[0] as estypes.MlPutTrainedModelRequest).body;
        const job = getJobDetailsFromTrainedModel(model);
        await jobSavedObjectService.createTrainedModel(modelId, job);
      }
      return resp;
    },
    async revertModelSnapshot(...p: Parameters<MlClient['revertModelSnapshot']>) {
      await jobIdsCheck('anomaly-detector', p);
      return mlClient.revertModelSnapshot(...p);
    },
    async setUpgradeMode(...p: Parameters<MlClient['setUpgradeMode']>) {
      return mlClient.setUpgradeMode(...p);
    },
    async startDataFrameAnalytics(...p: Parameters<MlClient['startDataFrameAnalytics']>) {
      await jobIdsCheck('data-frame-analytics', p);
      return mlClient.startDataFrameAnalytics(...p);
    },
    async startDatafeed(...p: Parameters<MlClient['startDatafeed']>) {
      await datafeedIdsCheck(p);
      return mlClient.startDatafeed(...p);
    },
    async stopDataFrameAnalytics(...p: Parameters<MlClient['stopDataFrameAnalytics']>) {
      await jobIdsCheck('data-frame-analytics', p);
      return mlClient.stopDataFrameAnalytics(...p);
    },
    async stopDatafeed(...p: Parameters<MlClient['stopDatafeed']>) {
      await datafeedIdsCheck(p);
      return mlClient.stopDatafeed(...p);
    },
    async updateDataFrameAnalytics(...p: Parameters<MlClient['updateDataFrameAnalytics']>) {
      await jobIdsCheck('data-frame-analytics', p);
      return mlClient.updateDataFrameAnalytics(...p);
    },
    async updateDatafeed(...p: Parameters<MlClient['updateDatafeed']>) {
      await datafeedIdsCheck(p);

      // Temporary workaround for the incorrect updateDatafeed function in the esclient
      if (
        // @ts-expect-error TS complains it's always false
        p.length === 0 ||
        p[0] === undefined
      ) {
        // Temporary generic error message. This should never be triggered
        // but is added for type correctness below
        throw new Error('Incorrect arguments supplied');
      }
      // @ts-expect-error body doesn't exist in the type
      const { datafeed_id: id, body } = p[0];

      return client.asInternalUser.transport.request(
        {
          method: 'POST',
          path: `/_ml/datafeeds/${id}/_update`,
          body,
        },
        p[1]
      );

      // this should be reinstated once https://github.com/elastic/elasticsearch-js/issues/1601
      // is fixed
      // return mlClient.updateDatafeed(...p);
    },
    async updateFilter(...p: Parameters<MlClient['updateFilter']>) {
      return mlClient.updateFilter(...p);
    },
    async updateJob(...p: Parameters<MlClient['updateJob']>) {
      await jobIdsCheck('anomaly-detector', p);
      return mlClient.updateJob(...p);
    },
    async resetJob(...p: Parameters<MlClient['resetJob']>) {
      await jobIdsCheck('anomaly-detector', p);
      return mlClient.resetJob(...p);
    },
    async updateModelSnapshot(...p: Parameters<MlClient['updateModelSnapshot']>) {
      await jobIdsCheck('anomaly-detector', p);
      return mlClient.updateModelSnapshot(...p);
    },
    async validate(...p: Parameters<MlClient['validate']>) {
      return mlClient.validate(...p);
    },
    async validateDetector(...p: Parameters<MlClient['validateDetector']>) {
      return mlClient.validateDetector(...p);
    },
    async getMemoryStats(...p: Parameters<MlClient['getMemoryStats']>) {
      return mlClient.getMemoryStats(...p);
    },

    ...searchProvider(client, jobSavedObjectService),
  } as MlClient;
}

function getDFAJobIdsFromRequest([params]: MlGetDFAParams): string[] {
  const ids = params?.id?.split(',');
  return ids || [];
}

function getModelIdsFromRequest([params]: MlGetTrainedModelParams): string[] {
  const id = params?.model_id;
  const ids = Array.isArray(id) ? id : id?.split(',');
  return ids || [];
}

function getADJobIdsFromRequest([params]: MlGetADParams): string[] {
  const ids = typeof params?.job_id === 'string' ? params?.job_id.split(',') : params?.job_id;
  return ids || [];
}

function getDatafeedIdsFromRequest([params]: MlGetDatafeedParams): string[] {
  const ids =
    typeof params?.datafeed_id === 'string' ? params?.datafeed_id.split(',') : params?.datafeed_id;
  return ids || [];
}

function getJobIdFromBody(p: any): string | undefined {
  const [params] = p;
  return params?.body?.job_id;
}

function filterAll(ids: string[]) {
  // if _all has been passed as the only id, remove it and assume it was
  // an empty list, so all items are returned.
  // if _all is one of many ids, the endpoint should look for
  // something called _all, which will subsequently fail.
  return ids.length === 1 && ids[0] === '_all' ? [] : ids;
}
