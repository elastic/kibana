/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IndicesOptions } from '../../../../common/types/anomaly_detection_jobs';
import { MlApiServices } from '../ml_api_service';
import type { AnomalyRecordDoc } from '../../../../common/types/anomalies';
import { InfluencersFilterQuery } from '../../../../common/types/es_client';
import { EntityField } from '../../../../common/util/anomaly_utils';
import { RuntimeMappings } from '../../../../common/types/fields';

type RecordForInfluencer = AnomalyRecordDoc;
export function resultsServiceProvider(mlApiServices: MlApiServices): {
  getScoresByBucket(
    jobIds: string[],
    earliestMs: number,
    latestMs: number,
    intervalMs: number,
    perPage?: number,
    fromPage?: number,
    swimLaneSeverity?: number,
    influencersFilterQuery?: InfluencersFilterQuery
  ): Promise<any>;
  getTopInfluencers(
    selectedJobIds: string[],
    earliestMs: number,
    latestMs: number,
    maxFieldValues?: number,
    perPage?: number,
    fromPage?: number,
    influencers?: EntityField[],
    influencersFilterQuery?: InfluencersFilterQuery
  ): Promise<any>;
  getTopInfluencerValues(): Promise<any>;
  getOverallBucketScores(
    jobIds: any,
    topN: any,
    earliestMs: any,
    latestMs: any,
    interval?: any,
    overallScore?: number
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
    influencersFilterQuery: InfluencersFilterQuery,
    swimLaneSeverity?: number
  ): Promise<any>;
  getRecordInfluencers(): Promise<any>;
  getRecordsForDetector(): Promise<any>;
  getRecords(): Promise<any>;
  getEventRateData(
    index: string,
    query: any,
    timeFieldName: string,
    earliestMs: number,
    latestMs: number,
    intervalMs: number,
    runtimeMappings?: RuntimeMappings,
    indicesOptions?: IndicesOptions
  ): Promise<any>;
  getEventDistributionData(
    index: string,
    splitField: EntityField | undefined | null,
    filterField: EntityField | undefined | null,
    query: any,
    metricFunction: string | undefined | null, // ES aggregation name
    metricFieldName: string | undefined,
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
