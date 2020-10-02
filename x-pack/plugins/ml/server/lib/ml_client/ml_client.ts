/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { RequestHandlerContext, ElasticsearchClient } from 'kibana/server';

import { JobsInSpaces, JobType } from '../../saved_objects/filter';

import {
  Job,
  JobStats,
  Datafeed,
  DatafeedStats,
} from '../../../common/types/anomaly_detection_jobs';
import { Calendar } from '../../../common/types/calendars';

import { DataFrameAnalyticsConfig } from '../../../common/types/data_frame_analytics';

export type MlClient = ElasticsearchClient['ml'];

export function getMlClient(context: RequestHandlerContext, jobsInSpaces: JobsInSpaces): MlClient {
  const mlClient = context.core.elasticsearch.client.asInternalUser.ml;

  async function jobIdsCheck(jobType: JobType, p: any) {
    const jobIds = getADJobIds(p);
    if (jobIds.length) {
      const filteredJobIds = await jobsInSpaces.filterJobIdsForSpace(jobType, jobIds);
      const missingIds = jobIds.filter((j) => filteredJobIds.indexOf(j) === -1);
      if (missingIds.length) {
        throw Boom.notFound(`${missingIds.join(',')} missing`);
      }
    }
  }

  async function datafeedIdsCheck(p: any) {
    const datafeedIds = getDatafeedIds(p);
    if (datafeedIds.length) {
      const filteredDatafeedIds = await jobsInSpaces.filterDatafeedIdsForSpace(datafeedIds);
      const missingIds = datafeedIds.filter((j) => filteredDatafeedIds.indexOf(j) === -1);
      if (missingIds.length) {
        throw Boom.notFound(`${missingIds.join(',')} missing`);
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
      await jobIdsCheck('anomaly-detector', p);
      return mlClient.deleteCalendarJob(...p);
    },
    async deleteDataFrameAnalytics(...p: Parameters<MlClient['deleteDataFrameAnalytics']>) {
      await jobIdsCheck('data-frame-analytics', p);
      const resp = await mlClient.deleteDataFrameAnalytics(...p);
      const [analyticsId] = getDFAJobIds(p);
      if (analyticsId !== undefined) {
        await jobsInSpaces.deleteDataFrameAnalyticsJob(analyticsId);
      }
      return resp;
    },
    async deleteDatafeed(...p: any) {
      await datafeedIdsCheck(p);
      const resp = await mlClient.deleteDatafeed(...p);
      const [datafeedId] = getDatafeedIds(p);
      if (datafeedId !== undefined) {
        await jobsInSpaces.deleteDatafeed(datafeedId);
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
      const [jobId] = getADJobIds(p);
      if (jobId !== undefined) {
        await jobsInSpaces.deleteAnomalyDetectionJob(jobId);
      }
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
    async findFileStructure(...p: Parameters<MlClient['findFileStructure']>) {
      return mlClient.findFileStructure(...p);
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
      // flatten the list of all jobs ids and check which ones are valid
      const filteredJobs = await jobsInSpaces.filterJobIdsForSpace('anomaly-detector', [
        ...new Set(body.calendars.map((c) => c.job_ids).flat()),
      ]);
      const calendars = body.calendars.map((c) => ({
        ...c,
        job_ids: c.job_ids.filter((id) => filteredJobs.includes(id)),
      }));
      return { body: { ...body, calendars } };
    },
    async getCategories(...p: Parameters<MlClient['getCategories']>) {
      await jobIdsCheck('anomaly-detector', p);
      return mlClient.getCategories(...p);
    },
    async getDataFrameAnalytics(...p: Parameters<MlClient['getDataFrameAnalytics']>) {
      await jobIdsCheck('data-frame-analytics', p);
      const { body } = await mlClient.getDataFrameAnalytics<{
        data_frame_analytics: DataFrameAnalyticsConfig[];
      }>(...p);
      const jobs = await jobsInSpaces.filterJobsForSpace<DataFrameAnalyticsConfig>(
        'data-frame-analytics',
        body.data_frame_analytics,
        'id'
      );
      return { body: { ...body, count: jobs.length, data_frame_analytics: jobs } };
    },
    async getDataFrameAnalyticsStats(...p: Parameters<MlClient['getDataFrameAnalyticsStats']>) {
      // this should use DataFrameAnalyticsStats, but needs a refactor !!!!!!!!!!!!!!
      await jobIdsCheck('data-frame-analytics', p);
      const { body } = await mlClient.getDataFrameAnalyticsStats<{
        data_frame_analytics: DataFrameAnalyticsConfig[];
      }>(...p);
      const jobs = await jobsInSpaces.filterJobsForSpace<DataFrameAnalyticsConfig>(
        'data-frame-analytics',
        body.data_frame_analytics,
        'id'
      );
      return { body: { ...body, count: jobs.length, data_frame_analytics: jobs } };
    },
    async getDatafeedStats(...p: Parameters<MlClient['getDatafeedStats']>) {
      const { body } = await mlClient.getDatafeedStats<{ datafeeds: DatafeedStats[] }>(...p);
      const datafeeds = await jobsInSpaces.filterDatafeedsForSpace<DatafeedStats>(
        'anomaly-detector',
        body.datafeeds,
        'datafeed_id'
      );
      return { body: { ...body, count: datafeeds.length, datafeeds } };
    },
    async getDatafeeds(...p: Parameters<MlClient['getDatafeeds']>) {
      await datafeedIdsCheck(p);
      const { body } = await mlClient.getDatafeeds<{ datafeeds: Datafeed[] }>(...p);
      const datafeeds = await jobsInSpaces.filterDatafeedsForSpace<Datafeed>(
        'anomaly-detector',
        body.datafeeds,
        'datafeed_id'
      );
      return { body: { ...body, count: datafeeds.length, datafeeds } };
    },
    async getFilters(...p: Parameters<MlClient['getFilters']>) {
      return mlClient.getFilters(...p);
    },
    async getInfluencers(...p: Parameters<MlClient['getInfluencers']>) {
      await jobIdsCheck('anomaly-detector', p);
      return mlClient.getInfluencers(...p);
    },
    async getJobStats(...p: Parameters<MlClient['getJobStats']>) {
      await jobIdsCheck('anomaly-detector', p);
      const { body } = await mlClient.getJobStats<{ jobs: JobStats[] }>(...p);
      const jobs = await jobsInSpaces.filterJobsForSpace<JobStats>(
        'anomaly-detector',
        body.jobs,
        'job_id'
      );
      return { body: { ...body, count: jobs.length, jobs } };
    },
    async getJobs(...p: Parameters<MlClient['getJobs']>) {
      await jobIdsCheck('anomaly-detector', p);
      // if ids specified, should we get only use for the get jobs?
      // we would have to expand wildcards and send them to getJobs
      const { body } = await mlClient.getJobs<{ jobs: Job[] }>(...p);
      const jobs = await jobsInSpaces.filterJobsForSpace<Job>(
        'anomaly-detector',
        body.jobs,
        'job_id'
      );
      return { body: { ...body, count: jobs.length, jobs } };
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
      await jobIdsCheck('anomaly-detector', p);
      return mlClient.putCalendarJob(...p);
    },
    async putDataFrameAnalytics(...p: Parameters<MlClient['putDataFrameAnalytics']>) {
      const resp = await mlClient.putDataFrameAnalytics(...p);
      const [analyticsId] = getDFAJobIds(p);
      if (analyticsId !== undefined) {
        await jobsInSpaces.createDataFrameAnalyticsJob(analyticsId);
      }
      return resp;
    },
    async putDatafeed(...p: Parameters<MlClient['putDatafeed']>) {
      const resp = await mlClient.putDatafeed(...p);
      const [datafeedId] = getDatafeedIds(p);
      const jobId = getJobIdFromBody(p);
      if (datafeedId !== undefined && jobId !== undefined) {
        await jobsInSpaces.addDatafeed(datafeedId, jobId);
      }

      return resp;
    },
    async putFilter(...p: Parameters<MlClient['putFilter']>) {
      return mlClient.putFilter(...p);
    },
    async putJob(...p: Parameters<MlClient['putJob']>) {
      const resp = await mlClient.putJob(...p);
      const [jobId] = getADJobIds(p);
      if (jobId !== undefined) {
        await jobsInSpaces.createAnomalyDetectionJob(jobId);
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
  } as MlClient;
}

function getDFAJobIds(p: any): string[] {
  const [params] = p;
  const ids = params?.id?.split(',');
  return ids || [];
}

function getADJobIds(p: any): string[] {
  const [params] = p;
  const ids = params?.job_id?.split(',');
  return ids || [];
}

function getDatafeedIds(p: any): string[] {
  const [params] = p;
  const ids = params?.datafeed_id?.split(',');
  return ids || [];
}

function getJobIdFromBody(p: any): string | undefined {
  const [params] = p;
  return params?.body?.job_id;
}
