/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

declare interface MlResultsService {
  getScoresByBucket: (
    jobIds: string[],
    earliestMs: number,
    latestMs: number,
    interval: string | number,
    maxResults: number
  ) => Promise<any>;
  getScheduledEventsByBucket: () => Promise<any>;
  getTopInfluencers: () => Promise<any>;
  getTopInfluencerValues: () => Promise<any>;
  getOverallBucketScores: () => Promise<any>;
  getInfluencerValueMaxScoreByTime: () => Promise<any>;
  getRecordInfluencers: () => Promise<any>;
  getRecordsForInfluencer: () => Promise<any>;
  getRecordsForDetector: () => Promise<any>;
  getRecords: () => Promise<any>;
  getRecordsForCriteria: () => Promise<any>;
  getMetricData: () => Promise<any>;
  getEventRateData: (
    index: string,
    query: any,
    timeFieldName: string,
    earliestMs: number,
    latestMs: number,
    interval: string | number
  ) => Promise<any>;
  getEventDistributionData: () => Promise<any>;
  getModelPlotOutput: (
    jobId: string,
    detectorIndex: number,
    criteriaFields: string[],
    earliestMs: number,
    latestMs: number,
    interval: string | number,
    aggType: {
      min: string;
      max: string;
    }
  ) => Promise<any>;
  getRecordMaxScoreByTime: () => Promise<any>;
}

export const mlResultsService: MlResultsService;
