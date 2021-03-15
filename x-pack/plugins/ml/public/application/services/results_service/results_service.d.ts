/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IndicesOptions } from '../../../../common/types/anomaly_detection_jobs';
import { MlApiServices } from '../ml_api_service';

export function resultsServiceProvider(
  mlApiServices: MlApiServices
): {
  getScoresByBucket(
    jobIds: string[],
    earliestMs: number,
    latestMs: number,
    intervalMs: number,
    perPage?: number,
    fromPage?: number
  ): Promise<any>;
  getTopInfluencers(
    selectedJobIds: string[],
    earliestMs: number,
    latestMs: number,
    maxFieldValues: number,
    perPage?: number,
    fromPage?: number,
    influencers?: any[],
    influencersFilterQuery?: any
  ): Promise<any>;
  getTopInfluencerValues(): Promise<any>;
  getOverallBucketScores(
    jobIds: any,
    topN: any,
    earliestMs: any,
    latestMs: any,
    interval?: any
  ): Promise<any>;
  getInfluencerValueMaxScoreByTime(
    jobIds: string[],
    influencerFieldName: string,
    influencerFieldValues: string[],
    earliestMs: number,
    latestMs: number,
    intervalMs: number,
    maxResults: number,
    perPage: number,
    fromPage: number,
    influencersFilterQuery: any
  ): Promise<any>;
  getRecordInfluencers(): Promise<any>;
  getRecordsForInfluencer(): Promise<any>;
  getRecordsForDetector(): Promise<any>;
  getRecords(): Promise<any>;
  getEventRateData(
    index: string,
    query: any,
    timeFieldName: string,
    earliestMs: number,
    latestMs: number,
    intervalMs: number,
    indicesOptions?: IndicesOptions
  ): Promise<any>;
  getEventDistributionData(
    index: string,
    splitField: string,
    filterField: string,
    query: any,
    metricFunction: string, // ES aggregation name
    metricFieldName: string,
    timeFieldName: string,
    earliestMs: number,
    latestMs: number,
    intervalMs: number
  ): Promise<any>;
  getRecordMaxScoreByTime(
    jobId: string,
    criteriaFields: any[],
    earliestMs: number,
    latestMs: number,
    intervalMs: number,
    actualPlotFunctionIfMetric?: string
  ): Promise<any>;
};
