/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from 'kibana/server';
import { searchProvider } from './search';

type OrigMlClient = ElasticsearchClient['ml'];

export interface MlClient extends OrigMlClient {
  anomalySearch: ReturnType<typeof searchProvider>['anomalySearch'];
}

export type MlClientParams =
  | Parameters<MlClient['closeJob']>
  | Parameters<MlClient['deleteCalendar']>
  | Parameters<MlClient['deleteCalendarEvent']>
  | Parameters<MlClient['deleteCalendarJob']>
  | Parameters<MlClient['deleteDataFrameAnalytics']>
  | Parameters<MlClient['deleteExpiredData']>
  | Parameters<MlClient['deleteFilter']>
  | Parameters<MlClient['deleteForecast']>
  | Parameters<MlClient['deleteJob']>
  | Parameters<MlClient['deleteModelSnapshot']>
  | Parameters<MlClient['deleteTrainedModel']>
  | Parameters<MlClient['estimateModelMemory']>
  | Parameters<MlClient['evaluateDataFrame']>
  | Parameters<MlClient['explainDataFrameAnalytics']>
  | Parameters<MlClient['flushJob']>
  | Parameters<MlClient['forecast']>
  | Parameters<MlClient['getBuckets']>
  | Parameters<MlClient['getCalendarEvents']>
  | Parameters<MlClient['getCalendars']>
  | Parameters<MlClient['getCategories']>
  | Parameters<MlClient['getDataFrameAnalytics']>
  | Parameters<MlClient['getDataFrameAnalyticsStats']>
  | Parameters<MlClient['getDatafeedStats']>
  | Parameters<MlClient['getDatafeeds']>
  | Parameters<MlClient['getFilters']>
  | Parameters<MlClient['getInfluencers']>
  | Parameters<MlClient['getJobStats']>
  | Parameters<MlClient['getJobs']>
  | Parameters<MlClient['getModelSnapshots']>
  | Parameters<MlClient['getOverallBuckets']>
  | Parameters<MlClient['getRecords']>
  | Parameters<MlClient['getTrainedModels']>
  | Parameters<MlClient['getTrainedModelsStats']>
  | Parameters<MlClient['startTrainedModelDeployment']>
  | Parameters<MlClient['stopTrainedModelDeployment']>
  | Parameters<MlClient['info']>
  | Parameters<MlClient['openJob']>
  | Parameters<MlClient['postCalendarEvents']>
  | Parameters<MlClient['postData']>
  | Parameters<MlClient['previewDatafeed']>
  | Parameters<MlClient['putCalendar']>
  | Parameters<MlClient['putCalendarJob']>
  | Parameters<MlClient['putDataFrameAnalytics']>
  | Parameters<MlClient['putDatafeed']>
  | Parameters<MlClient['putFilter']>
  | Parameters<MlClient['putJob']>
  | Parameters<MlClient['putTrainedModel']>
  | Parameters<MlClient['revertModelSnapshot']>
  | Parameters<MlClient['setUpgradeMode']>
  | Parameters<MlClient['startDataFrameAnalytics']>
  | Parameters<MlClient['startDatafeed']>
  | Parameters<MlClient['stopDataFrameAnalytics']>
  | Parameters<MlClient['stopDatafeed']>
  | Parameters<MlClient['updateDataFrameAnalytics']>
  | Parameters<MlClient['updateDatafeed']>
  | Parameters<MlClient['updateFilter']>
  | Parameters<MlClient['updateJob']>
  | Parameters<MlClient['updateModelSnapshot']>
  | Parameters<MlClient['validate']>
  | Parameters<MlClient['validateDetector']>;

export type MlGetADParams = Parameters<MlClient['getJobStats']> | Parameters<MlClient['getJobs']>;

export type MlGetDatafeedParams =
  | Parameters<MlClient['getDatafeedStats']>
  | Parameters<MlClient['getDatafeeds']>;

export type MlGetDFAParams =
  | Parameters<MlClient['getDataFrameAnalytics']>
  | Parameters<MlClient['getDataFrameAnalyticsStats']>
  | Parameters<MlClient['putDataFrameAnalytics']>;

export type MlGetTrainedModelParams =
  | Parameters<MlClient['putTrainedModel']>
  | Parameters<MlClient['deleteTrainedModel']>
  | Parameters<MlClient['getTrainedModels']>
  | Parameters<MlClient['getTrainedModelsStats']>
  | Parameters<MlClient['startTrainedModelDeployment']>
  | Parameters<MlClient['stopTrainedModelDeployment']>;
