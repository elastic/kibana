/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PARTITION_FIELDS } from '../constants/anomalies';

export interface Influencer {
  influencer_field_name: string;
  influencer_field_values: string[];
}

export interface AnomalyRecordDoc {
  [key: string]: any;
  job_id: string;
  result_type: string;
  probability: number;
  record_score: number;
  initial_record_score: number;
  bucket_span: number;
  detector_index: number;
  is_interim: boolean;
  timestamp: number;
  partition_field_name?: string;
  partition_field_value?: string | number;
  function: string;
  function_description: string;
  typical?: number[];
  actual?: number[];
  influencers?: Influencer[];
  by_field_name?: string;
  field_name?: string;
  by_field_value?: string;
  multi_bucket_impact?: number;
  over_field_name?: string;
  over_field_value?: string;
  // TODO provide the causes resource interface.
  causes?: any[];
}

export interface AnomaliesTableRecord {
  time: number;
  source: AnomalyRecordDoc;
  rowId: string;
  jobId: string;
  detectorIndex: number;
  severity: number;
  entityName?: string;
  entityValue?: any;
  influencers?: Array<{ [key: string]: any }>;
  actual?: number[];
  actualSort?: any;
  typical?: number[];
  typicalSort?: any;
  metricDescriptionSort?: number;
}

export type PartitionFieldsType = typeof PARTITION_FIELDS[number];
