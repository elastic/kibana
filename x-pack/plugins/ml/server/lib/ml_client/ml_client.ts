/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

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
  // type PP<T> = P[T];
  const jobsInSpaces = filterJobIdsFactory(context.core.savedObjects.client);
  const mlClient = context.core.elasticsearch.client.asInternalUser.ml;

  return {
    async getJobs(...p: Parameters<MlClient['getJobs']>) {
      const { body } = await mlClient.getJobs<{ jobs: Job[] }>(...p);
      const jobs = await jobsInSpaces.filterJobsForSpace<Job>(
        'anomaly-detector',
        body.jobs,
        'job_id'
      );
      // if (jobs.length===0) {
      //   throw {body: createError()}
      // }

      return { body: { ...body, jobs } };
    },
    async getJobStats(...p: Parameters<MlClient['getJobStats']>) {
      const { body } = await mlClient.getJobStats<{ jobs: JobStats[] }>(...p);
      const jobs = await jobsInSpaces.filterJobsForSpace<JobStats>(
        'anomaly-detector',
        body.jobs,
        'job_id'
      );
      // if (jobs.length===0) {
      //   throw {body: createError()}
      // }

      return { body: { ...body, jobs } };
    },
    async getDatafeeds(...p: Parameters<MlClient['getDatafeeds']>) {
      const { body } = await mlClient.getDatafeeds<{ datafeeds: Datafeed[] }>(...p);
      const datafeeds = await jobsInSpaces.filterJobsForSpace<Datafeed>(
        'anomaly-detector',
        body.datafeeds,
        'datafeed_id'
      );
      createError('anomaly-detector', 'datafeed_id');
      // if (jobs.length===0) {
      //   throw {body: createError()}
      // }

      return { body: { ...body, datafeeds } };
    },
    async getDatafeedStats(...p: Parameters<MlClient['getDatafeedStats']>) {
      const { body } = await mlClient.getDatafeedStats<{ datafeeds: DatafeedStats[] }>(...p);
      const datafeeds = await jobsInSpaces.filterJobsForSpace<DatafeedStats>(
        'anomaly-detector',
        body.datafeeds,
        'datafeed_id'
      );
      // if (jobs.length===0) {
      //   throw {body: createError()}
      // }

      return { body: { ...body, datafeeds } };
    },
    closeJob: (...p: any) => mlClient.closeJob(...p),
    deleteCalendar: (...p: any) => mlClient.deleteCalendar(...p),
    deleteCalendarEvent: (...p: any) => mlClient.deleteCalendarEvent(...p),
    deleteCalendarJob: (...p: any) => mlClient.deleteCalendarJob(...p),
    deleteDataFrameAnalytics: (...p: any) => mlClient.deleteDataFrameAnalytics(...p),
    deleteDatafeed: (...p: any) => mlClient.deleteDatafeed(...p),
    deleteExpiredData: (...p: any) => mlClient.deleteExpiredData(...p),
    deleteFilter: (...p: any) => mlClient.deleteFilter(...p),
    deleteForecast: (...p: any) => mlClient.deleteForecast(...p),
    deleteJob: (...p: any) => mlClient.deleteJob(...p),
    deleteModelSnapshot: (...p: any) => mlClient.deleteModelSnapshot(...p),
    deleteTrainedModel: (...p: any) => mlClient.deleteTrainedModel(...p),
    estimateModelMemory: (...p: any) => mlClient.estimateModelMemory(...p),
    evaluateDataFrame: (...p: any) => mlClient.evaluateDataFrame(...p),
    explainDataFrameAnalytics: (...p: any) => mlClient.explainDataFrameAnalytics(...p),
    findFileStructure: (...p: any) => mlClient.findFileStructure(...p),
    flushJob: (...p: any) => mlClient.flushJob(...p),
    forecast: (...p: any) => mlClient.forecast(...p),
    getBuckets: (...p: any) => mlClient.getBuckets(...p),
    getCalendarEvents: (...p: any) => mlClient.getCalendarEvents(...p),
    getCalendars: (...p: any) => mlClient.getCalendars(...p),
    getCategories: (...p: any) => mlClient.getCategories(...p),
    getDataFrameAnalytics: (...p: any) => mlClient.getDataFrameAnalytics(...p),
    getDataFrameAnalyticsStats: (...p: any) => mlClient.getDataFrameAnalyticsStats(...p),
    // getDatafeedStats: mlClient.getDatafeedStats,
    // getDatafeeds: mlClient.getDatafeeds,
    getFilters: (...p: any) => mlClient.getFilters(...p),
    getInfluencers: (...p: any) => mlClient.getInfluencers(...p),
    // getJobStats: mlClient.getJobStats,
    // getJobs: mlClient.getJobs,
    getModelSnapshots: (...p: any) => mlClient.getModelSnapshots(...p),
    getOverallBuckets: (...p: any) => mlClient.getOverallBuckets(...p),
    getRecords: (...p: any) => mlClient.getRecords(...p),
    getTrainedModels: (...p: any) => mlClient.getTrainedModels(...p),
    getTrainedModelsStats: (...p: any) => mlClient.getTrainedModelsStats(...p),
    info: (...p: any) => mlClient.info(...p),
    openJob: (...p: any) => mlClient.openJob(...p),
    postCalendarEvents: (...p: any) => mlClient.postCalendarEvents(...p),
    postData: (...p: any) => mlClient.postData(...p),
    previewDatafeed: (...p: any) => mlClient.previewDatafeed(...p),
    putCalendar: (...p: any) => mlClient.putCalendar(...p),
    putCalendarJob: (...p: any) => mlClient.putCalendarJob(...p),
    putDataFrameAnalytics: (...p: any) => mlClient.putDataFrameAnalytics(...p),
    putDatafeed: (...p: any) => mlClient.putDatafeed(...p),
    putFilter: (...p: any) => mlClient.putFilter(...p),
    putJob: (...p: any) => mlClient.putJob(...p),
    putTrainedModel: (...p: any) => mlClient.putTrainedModel(...p),
    revertModelSnapshot: (...p: any) => mlClient.revertModelSnapshot(...p),
    setUpgradeMode: (...p: any) => mlClient.setUpgradeMode(...p),
    startDataFrameAnalytics: (...p: any) => mlClient.startDataFrameAnalytics(...p),
    startDatafeed: (...p: any) => mlClient.startDatafeed(...p),
    stopDataFrameAnalytics: (...p: any) => mlClient.stopDataFrameAnalytics(...p),
    stopDatafeed: (...p: any) => mlClient.stopDatafeed(...p),
    updateDataFrameAnalytics: (...p: any) => mlClient.updateDataFrameAnalytics(...p),
    updateDatafeed: (...p: any) => mlClient.updateDatafeed(...p),
    updateFilter: (...p: any) => mlClient.updateFilter(...p),
    updateJob: (...p: any) => mlClient.updateJob(...p),
    updateModelSnapshot: (...p: any) => mlClient.updateModelSnapshot(...p),
    validate: (...p: any) => mlClient.validate(...p),
    validateDetector: (...p: any) => mlClient.validateDetector(...p),
  } as MlClient;
}
