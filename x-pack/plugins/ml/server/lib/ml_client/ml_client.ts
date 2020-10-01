/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { RequestHandlerContext, ElasticsearchClient } from 'kibana/server';

import { filterJobIdsFactory, createError } from '../../saved_objects/filter';

import {
  Job,
  JobStats,
  Datafeed,
  DatafeedStats,
} from '../../../common/types/anomaly_detection_jobs';

export type MlClient = ElasticsearchClient['ml'];

export function getMlClient(context: RequestHandlerContext): MlClient {
  const jobsInSpaces = filterJobIdsFactory(context.core.savedObjects.client);
  const mlClient = context.core.elasticsearch.client.asInternalUser.ml;

  async function filterADJobsForSpace<T>(jobs: T[]) {
    return await jobsInSpaces.filterJobsForSpace<T>('anomaly-detector', jobs, 'job_id' as keyof T);
  }

  async function filterDatafeedsForSpace<T>(datafeeds: T[]) {
    return await jobsInSpaces.filterDatafeedsForSpace<T>(
      'anomaly-detector',
      datafeeds,
      'datafeed_id' as keyof T
    );
  }

  async function jobIdsCheck(p: any) {
    const jobIds = getJobIds(p);
    if (jobIds.length) {
      const filteredJobIds = await jobsInSpaces.filterJobIdsForSpace('anomaly-detector', jobIds);
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

  // async function filterDFAJobsForSpace<T>(jobs: T[]) {
  //   return await jobsInSpaces.filterJobsForSpace<T>(
  //     'data-frame-analytics',
  //     jobs,
  //     'job_id' as keyof T
  //   );
  // }

  return {
    async closeJob(...p: Parameters<MlClient['closeJob']>) {
      await jobIdsCheck(p);
      return mlClient.closeJob(...p);
    },
    async deleteCalendar(...p: Parameters<MlClient['deleteCalendar']>) {
      return mlClient.deleteCalendar(...p);
    },
    async deleteCalendarEvent(...p: Parameters<MlClient['deleteCalendarEvent']>) {
      return mlClient.deleteCalendarEvent(...p);
    },
    async deleteCalendarJob(...p: Parameters<MlClient['deleteCalendarJob']>) {
      await jobIdsCheck(p);
      return mlClient.deleteCalendarJob(...p);
    },
    async deleteDataFrameAnalytics(...p: Parameters<MlClient['deleteDataFrameAnalytics']>) {
      // FIX!!!!!!!!!!!!!
      return mlClient.deleteDataFrameAnalytics(...p);
    },
    async deleteDatafeed(...p: any) {
      await datafeedIdsCheck(p);
      return mlClient.deleteDatafeed(...p);
    },
    async deleteExpiredData(...p: Parameters<MlClient['deleteExpiredData']>) {
      await jobIdsCheck(p);
      return mlClient.deleteExpiredData(...p);
    },
    async deleteFilter(...p: Parameters<MlClient['deleteFilter']>) {
      return mlClient.deleteFilter(...p);
    },
    async deleteForecast(...p: Parameters<MlClient['deleteForecast']>) {
      await jobIdsCheck(p);
      return mlClient.deleteForecast(...p);
    },
    async deleteJob(...p: Parameters<MlClient['deleteJob']>) {
      await jobIdsCheck(p);
      return mlClient.deleteJob(...p);
    },
    async deleteModelSnapshot(...p: Parameters<MlClient['deleteModelSnapshot']>) {
      await jobIdsCheck(p);
      return mlClient.deleteModelSnapshot(...p);
    },
    async deleteTrainedModel(...p: Parameters<MlClient['deleteTrainedModel']>) {
      // FIX!!!!!!!!!!!!!
      return mlClient.deleteTrainedModel(...p);
    },
    async estimateModelMemory(...p: Parameters<MlClient['estimateModelMemory']>) {
      return mlClient.estimateModelMemory(...p);
    },
    async evaluateDataFrame(...p: Parameters<MlClient['evaluateDataFrame']>) {
      // FIX!!!!!!!!!!!!!
      return mlClient.evaluateDataFrame(...p);
    },
    async explainDataFrameAnalytics(...p: Parameters<MlClient['explainDataFrameAnalytics']>) {
      // FIX!!!!!!!!!!!!!
      return mlClient.explainDataFrameAnalytics(...p);
    },
    async findFileStructure(...p: Parameters<MlClient['findFileStructure']>) {
      return mlClient.findFileStructure(...p);
    },
    async flushJob(...p: Parameters<MlClient['flushJob']>) {
      await jobIdsCheck(p);
      return mlClient.flushJob(...p);
    },
    async forecast(...p: Parameters<MlClient['forecast']>) {
      await jobIdsCheck(p);
      return mlClient.forecast(...p);
    },
    async getBuckets(...p: Parameters<MlClient['getBuckets']>) {
      await jobIdsCheck(p);
      return mlClient.getBuckets(...p);
    },
    async getCalendarEvents(...p: Parameters<MlClient['getCalendarEvents']>) {
      await jobIdsCheck(p);
      return mlClient.getCalendarEvents(...p);
    },
    async getCalendars(...p: Parameters<MlClient['getCalendars']>) {
      return mlClient.getCalendars(...p);
    },
    async getCategories(...p: Parameters<MlClient['getCategories']>) {
      await jobIdsCheck(p);
      return mlClient.getCategories(...p);
    },
    async getDataFrameAnalytics(...p: Parameters<MlClient['getDataFrameAnalytics']>) {
      // FIX!!!!!!!!!!!!!
      return mlClient.getDataFrameAnalytics(...p);
    },
    async getDataFrameAnalyticsStats(...p: Parameters<MlClient['getDataFrameAnalyticsStats']>) {
      // FIX!!!!!!!!!!!!!
      return mlClient.getDataFrameAnalyticsStats(...p);
    },
    async getDatafeedStats(...p: Parameters<MlClient['getDatafeedStats']>) {
      const { body } = await mlClient.getDatafeedStats<{ datafeeds: DatafeedStats[] }>(...p);
      const datafeeds = await filterDatafeedsForSpace<DatafeedStats>(body.datafeeds);
      return { body: { ...body, count: datafeeds.length, datafeeds } };
    },
    async getDatafeeds(...p: Parameters<MlClient['getDatafeeds']>) {
      await datafeedIdsCheck(p);
      const { body } = await mlClient.getDatafeeds<{ datafeeds: Datafeed[] }>(...p);
      const datafeeds = await filterDatafeedsForSpace<Datafeed>(body.datafeeds);
      return { body: { ...body, count: datafeeds.length, datafeeds } };
    },
    async getFilters(...p: Parameters<MlClient['getFilters']>) {
      return mlClient.getFilters(...p);
    },
    async getInfluencers(...p: Parameters<MlClient['getInfluencers']>) {
      await jobIdsCheck(p);
      return mlClient.getInfluencers(...p);
    },
    async getJobStats(...p: Parameters<MlClient['getJobStats']>) {
      await jobIdsCheck(p);
      const { body } = await mlClient.getJobStats<{ jobs: JobStats[] }>(...p);
      const jobs = await filterADJobsForSpace<JobStats>(body.jobs);
      return { body: { ...body, count: jobs.length, jobs } };
    },
    async getJobs(...p: Parameters<MlClient['getJobs']>) {
      await jobIdsCheck(p);
      // if ids specified, should we get only use for the get jobs?
      // we would have to expand wildcards and send them to getJobs
      const { body } = await mlClient.getJobs<{ jobs: Job[] }>(...p);
      const jobs = await filterADJobsForSpace<Job>(body.jobs);
      return { body: { ...body, count: jobs.length, jobs } };
    },
    async getModelSnapshots(...p: Parameters<MlClient['getModelSnapshots']>) {
      await jobIdsCheck(p);
      return mlClient.getModelSnapshots(...p);
    },
    async getOverallBuckets(...p: Parameters<MlClient['getOverallBuckets']>) {
      await jobIdsCheck(p);
      return mlClient.getOverallBuckets(...p);
    },
    async getRecords(...p: Parameters<MlClient['getRecords']>) {
      await jobIdsCheck(p);
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
      await jobIdsCheck(p);
      return mlClient.openJob(...p);
    },
    async postCalendarEvents(...p: Parameters<MlClient['postCalendarEvents']>) {
      return mlClient.postCalendarEvents(...p);
    },
    async postData(...p: Parameters<MlClient['postData']>) {
      await jobIdsCheck(p);
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
      await jobIdsCheck(p);
      return mlClient.putCalendarJob(...p);
    },
    async putDataFrameAnalytics(...p: Parameters<MlClient['putDataFrameAnalytics']>) {
      // FIX!!!!!!!!!!!
      return mlClient.putDataFrameAnalytics(...p);
    },
    async putDatafeed(...p: Parameters<MlClient['putDatafeed']>) {
      // SHOULD WE DO A JOB CHECK HERE???!!!!!!!!!!
      // should we do a datafeed exists check? YES
      return mlClient.putDatafeed(...p);
    },
    async putFilter(...p: Parameters<MlClient['putFilter']>) {
      return mlClient.putFilter(...p);
    },
    async putJob(...p: Parameters<MlClient['putJob']>) {
      // CHECK FOR EXISTING JOB!!!!!!!!!!!!
      // await jobIdsCheck(p);
      return mlClient.putJob(...p);
    },
    async putTrainedModel(...p: Parameters<MlClient['putTrainedModel']>) {
      return mlClient.putTrainedModel(...p);
    },
    async revertModelSnapshot(...p: Parameters<MlClient['revertModelSnapshot']>) {
      await jobIdsCheck(p);
      return mlClient.revertModelSnapshot(...p);
    },
    async setUpgradeMode(...p: Parameters<MlClient['setUpgradeMode']>) {
      return mlClient.setUpgradeMode(...p);
    },
    async startDataFrameAnalytics(...p: Parameters<MlClient['startDataFrameAnalytics']>) {
      // FIX!!!!!!!!!!!
      return mlClient.startDataFrameAnalytics(...p);
    },
    async startDatafeed(...p: Parameters<MlClient['startDatafeed']>) {
      await datafeedIdsCheck(p);
      return mlClient.startDatafeed(...p);
    },
    async stopDataFrameAnalytics(...p: Parameters<MlClient['stopDataFrameAnalytics']>) {
      // FIX!!!!!!!!!!!!!
      return mlClient.stopDataFrameAnalytics(...p);
    },
    async stopDatafeed(...p: Parameters<MlClient['stopDatafeed']>) {
      await datafeedIdsCheck(p);
      return mlClient.stopDatafeed(...p);
    },
    async updateDataFrameAnalytics(...p: Parameters<MlClient['updateDataFrameAnalytics']>) {
      // FIX!!!!!!!!!!
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
      await jobIdsCheck(p);
      return mlClient.updateJob(...p);
    },
    async updateModelSnapshot(...p: Parameters<MlClient['updateModelSnapshot']>) {
      await jobIdsCheck(p);
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

function getJobIds(p: any): string[] {
  const [params] = p;
  const jobIds = params?.job_id?.split(',');
  return jobIds || [];
}

function getDatafeedIds(p: any): string[] {
  const [params] = p;
  const jobIds = params?.datafeed_id?.split(',');
  return jobIds || [];
}
