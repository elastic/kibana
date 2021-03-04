/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AnomalyResultType } from './anomalies';
import { ANOMALY_RESULT_TYPE } from '../constants/anomalies';
import { AlertTypeParams } from '../../../alerts/common';

export type PreviewResultsKeys = 'record_results' | 'bucket_results' | 'influencer_results';
export type TopHitsResultsKeys = 'top_record_hits' | 'top_bucket_hits' | 'top_influencer_hits';

export interface AlertExecutionResult {
  count: number;
  key: number;
  alertInstanceKey: string;
  isInterim: boolean;
  jobIds: string[];
  timestamp: number;
  timestampEpoch: number;
  timestampIso8601: string;
  score: number;
  bucketRange: { start: string; end: string };
  topRecords: RecordAnomalyAlertDoc[];
  topInfluencers?: InfluencerAnomalyAlertDoc[];
}

export interface PreviewResponse {
  count: number;
  results: AlertExecutionResult[];
}

interface BaseAnomalyAlertDoc {
  result_type: AnomalyResultType;
  job_id: string;
  /**
   * Rounded score
   */
  score: number;
  timestamp: number;
  is_interim: boolean;
  unique_key: string;
}

export interface RecordAnomalyAlertDoc extends BaseAnomalyAlertDoc {
  result_type: typeof ANOMALY_RESULT_TYPE.RECORD;
  function: string;
  field_name?: string;
  by_field_name?: string;
  by_field_value?: string | number;
  over_field_name?: string;
  over_field_value?: string | number;
  partition_field_name?: string;
  partition_field_value?: string | number;
}

export interface BucketAnomalyAlertDoc extends BaseAnomalyAlertDoc {
  result_type: typeof ANOMALY_RESULT_TYPE.BUCKET;
  start: number;
  end: number;
  timestamp_epoch: number;
  timestamp_iso8601: number;
}

export interface InfluencerAnomalyAlertDoc extends BaseAnomalyAlertDoc {
  result_type: typeof ANOMALY_RESULT_TYPE.INFLUENCER;
  influencer_field_name: string;
  influencer_field_value: string | number;
  influencer_score: number;
}

export type AlertHitDoc = RecordAnomalyAlertDoc | BucketAnomalyAlertDoc | InfluencerAnomalyAlertDoc;

export function isRecordAnomalyAlertDoc(arg: any): arg is RecordAnomalyAlertDoc {
  return arg.hasOwnProperty('result_type') && arg.result_type === ANOMALY_RESULT_TYPE.RECORD;
}

export function isBucketAnomalyAlertDoc(arg: any): arg is BucketAnomalyAlertDoc {
  return arg.hasOwnProperty('result_type') && arg.result_type === ANOMALY_RESULT_TYPE.BUCKET;
}

export function isInfluencerAnomalyAlertDoc(arg: any): arg is InfluencerAnomalyAlertDoc {
  return arg.hasOwnProperty('result_type') && arg.result_type === ANOMALY_RESULT_TYPE.INFLUENCER;
}

export type MlAnomalyDetectionAlertParams = {
  jobSelection: {
    jobIds?: string[];
    groupIds?: string[];
  };
  severity: number;
  resultType: AnomalyResultType;
  includeInterim: boolean;
} & AlertTypeParams;
