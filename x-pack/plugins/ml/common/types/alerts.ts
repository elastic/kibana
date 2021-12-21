/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AnomalyResultType } from './anomalies';
import { ANOMALY_RESULT_TYPE } from '../constants/anomalies';
import type { AlertTypeParams, Alert } from '../../../alerting/common';

export type PreviewResultsKeys = 'record_results' | 'bucket_results' | 'influencer_results';
export type TopHitsResultsKeys = 'top_record_hits' | 'top_bucket_hits' | 'top_influencer_hits';

export interface AlertExecutionResult {
  count: number;
  key?: number;
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
  message: string;
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
  typical: number[];
  actual: number[];
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
  lookbackInterval: string | null | undefined;
  topNBuckets: number | null | undefined;
} & AlertTypeParams;

export type MlAnomalyDetectionAlertAdvancedSettings = Pick<
  MlAnomalyDetectionAlertParams,
  'lookbackInterval' | 'topNBuckets'
>;

export type MlAnomalyDetectionAlertRule = Omit<Alert<MlAnomalyDetectionAlertParams>, 'apiKey'>;

export interface JobAlertingRuleStats {
  alerting_rules?: MlAnomalyDetectionAlertRule[];
}

export interface CommonHealthCheckConfig {
  enabled: boolean;
}

export type MlAnomalyDetectionJobsHealthRuleParams = {
  includeJobs: {
    jobIds?: string[];
    groupIds?: string[];
  };
  excludeJobs?: {
    jobIds?: string[];
    groupIds?: string[];
  } | null;
  testsConfig?: {
    datafeed?: CommonHealthCheckConfig | null;
    mml?: CommonHealthCheckConfig | null;
    delayedData?:
      | (CommonHealthCheckConfig & {
          docsCount?: number | null;
          timeInterval?: string | null;
        })
      | null;
    behindRealtime?:
      | (CommonHealthCheckConfig & {
          timeInterval?: string | null;
        })
      | null;
    errorMessages?: CommonHealthCheckConfig | null;
  } | null;
} & AlertTypeParams;

export type JobsHealthRuleTestsConfig = MlAnomalyDetectionJobsHealthRuleParams['testsConfig'];

export type JobsHealthTests = keyof Exclude<JobsHealthRuleTestsConfig, null | undefined>;
