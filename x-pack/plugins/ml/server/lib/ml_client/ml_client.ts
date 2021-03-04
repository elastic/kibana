/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient } from 'kibana/server';

import { JobSavedObjectService } from '../../saved_objects';
import { JobType } from '../../../common/types/saved_objects';

import {
  Job,
  JobStats,
  Datafeed,
  DatafeedStats,
} from '../../../common/types/anomaly_detection_jobs';
import { Calendar } from '../../../common/types/calendars';
import { searchProvider } from './search';

import { DataFrameAnalyticsConfig } from '../../../common/types/data_frame_analytics';
import { MLJobNotFound } from './errors';
import {
  MlClient,
  MlClientParams,
  MlGetADParams,
  MlGetDFAParams,
  MlGetDatafeedParams,
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
      await checkIds(jobType, jobIds, allowWildcards);
    }
  }

  async function checkIds(jobType: JobType, jobIds: string[], allowWildcards: boolean = false) {
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
        await checkIds('anomaly-detector', requestedJobIds, true);
      }
    }
  }

  async function groupIdsCheckFromJobStats(
    filteredJobIds: string[],
    ...p: Parameters<MlClient['getJobStats']>
  ) {
    // similar to groupIdsCheck above, however we need to load the jobs first to get the groups information
    const ids = getADJobIdsFromRequest(p);
    if (ids.length) {
      const { body } = await mlClient.getJobs<{ jobs: Job[] }>(...p);
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
    async deleteDatafeed(...p: any) {
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
      const { body } = await mlClient.getCalendars<{ calendars: Calendar[] }, any>(...p);
      const {
        body: { jobs: allJobs },
      } = await mlClient.getJobs<{ jobs: Job[] }>();
      const allJobIds = allJobs.map((j) => j.job_id);

      // flatten the list of all jobs ids and check which ones are valid
      const calJobIds = [...new Set(body.calendars.map((c) => c.job_ids).flat())];
      // find groups by getting the cal job ids which aren't real jobs.
      const groups = calJobIds.filter((j) => allJobIds.includes(j) === false);

      // get list of calendar jobs which are allowed in this space
      const filteredJobIds = await jobSavedObjectService.filterJobIdsForSpace(
        'anomaly-detector',
        calJobIds
      );
      const calendars = body.calendars.map((c) => ({
        ...c,
        job_ids: c.job_ids.filter((id) => filteredJobIds.includes(id) || groups.includes(id)),
        total_job_count: calJobIds.length,
      }));
      return { body: { ...body, calendars } };
    },
    async getCategories(...p: Parameters<MlClient['getCategories']>) {
      await jobIdsCheck('anomaly-detector', p);
      return mlClient.getCategories(...p);
    },
    async getDataFrameAnalytics(...p: Parameters<MlClient['getDataFrameAnalytics']>) {
      await jobIdsCheck('data-frame-analytics', p, true);
      try {
        const { body } = await mlClient.getDataFrameAnalytics<{
          data_frame_analytics: DataFrameAnalyticsConfig[];
        }>(...p);
        const jobs = await jobSavedObjectService.filterJobsForSpace<DataFrameAnalyticsConfig>(
          'data-frame-analytics',
          body.data_frame_analytics,
          'id'
        );
        return { body: { ...body, count: jobs.length, data_frame_analytics: jobs } };
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
        const { body } = await mlClient.getDataFrameAnalyticsStats<{
          data_frame_analytics: DataFrameAnalyticsConfig[];
        }>(...p);
        const jobs = await jobSavedObjectService.filterJobsForSpace<DataFrameAnalyticsConfig>(
          'data-frame-analytics',
          body.data_frame_analytics,
          'id'
        );
        return { body: { ...body, count: jobs.length, data_frame_analytics: jobs } };
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
        const { body } = await mlClient.getDatafeedStats<{ datafeeds: DatafeedStats[] }>(...p);
        const datafeeds = await jobSavedObjectService.filterDatafeedsForSpace<DatafeedStats>(
          'anomaly-detector',
          body.datafeeds,
          'datafeed_id'
        );
        return { body: { ...body, count: datafeeds.length, datafeeds } };
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
        const { body } = await mlClient.getDatafeeds<{ datafeeds: Datafeed[] }>(...p);
        const datafeeds = await jobSavedObjectService.filterDatafeedsForSpace<Datafeed>(
          'anomaly-detector',
          body.datafeeds,
          'datafeed_id'
        );
        return { body: { ...body, count: datafeeds.length, datafeeds } };
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
        const { body } = await mlClient.getJobStats<{ jobs: JobStats[] }>(...p);
        const jobs = await jobSavedObjectService.filterJobsForSpace<JobStats>(
          'anomaly-detector',
          body.jobs,
          'job_id'
        );
        await groupIdsCheckFromJobStats(
          jobs.map((j) => j.job_id),
          ...p
        );
        return { body: { ...body, count: jobs.length, jobs } };
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
        const { body } = await mlClient.getJobs<{ jobs: Job[] }>(...p);
        const jobs = await jobSavedObjectService.filterJobsForSpace<Job>(
          'anomaly-detector',
          body.jobs,
          'job_id'
        );
        await groupIdsCheck(
          p,
          body.jobs,
          jobs.map((j) => j.job_id)
        );
        return { body: { ...body, count: jobs.length, jobs } };
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
      return mlClient.getTrainedModels(...p);
    },
    async getTrainedModelsStats(...p: Parameters<MlClient['getTrainedModelsStats']>) {
      return mlClient.getTrainedModelsStats(...p);
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
      return mlClient.putTrainedModel(...p);
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
      return mlClient.updateDatafeed(...p);
    },
    async updateFilter(...p: Parameters<MlClient['updateFilter']>) {
      return mlClient.updateFilter(...p);
    },
    async updateJob(...p: Parameters<MlClient['updateJob']>) {
      await jobIdsCheck('anomaly-detector', p);
      return mlClient.updateJob(...p);
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

    ...searchProvider(client, jobSavedObjectService),
  } as MlClient;
}

function getDFAJobIdsFromRequest([params]: MlGetDFAParams): string[] {
  const ids = params?.id?.split(',');
  return ids || [];
}

function getADJobIdsFromRequest([params]: MlGetADParams): string[] {
  const ids = params?.job_id?.split(',');
  return ids || [];
}

function getDatafeedIdsFromRequest([params]: MlGetDatafeedParams): string[] {
  const ids = params?.datafeed_id?.split(',');
  return ids || [];
}

function getJobIdFromBody(p: any): string | undefined {
  const [params] = p;
  return params?.body?.job_id;
}
