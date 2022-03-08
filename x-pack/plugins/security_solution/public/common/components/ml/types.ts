/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Influencer } from '../../../../../ml/public';
import { FlowTarget } from '../../../../common/search_strategy';

import { HostsType } from '../../../hosts/store/model';
import { NetworkType } from '../../../network/store/model';
import { UsersType } from '../../../users/store/model';

export interface Source {
  job_id: string;
  result_type: string;
  probability: number;
  multi_bucket_impact: number;
  record_score: number;
  initial_record_score: number;
  bucket_span: number;
  detector_index: number;
  is_interim: boolean;
  timestamp: number;
  by_field_name: string;
  by_field_value: string;
  partition_field_name: string;
  partition_field_value: string;
  function: string;
  function_description: string;
  typical: number[];
  actual: number[];
  influencers: Influencer[];
}

export interface CriteriaFields {
  fieldName: string;
  fieldValue: string;
}

export interface InfluencerInput {
  fieldName: string;
  fieldValue: string;
}

export interface Anomaly {
  detectorIndex: number;
  entityName: string;
  entityValue: string;
  influencers?: Array<Record<string, string>>;
  jobId: string;
  rowId: string;
  severity: number;
  time: number;
  source: Source;
}

export interface Anomalies {
  anomalies: Anomaly[];
  interval: string;
}

export type NarrowDateRange = (score: Anomaly, interval: string) => void;

export interface AnomaliesBy {
  anomaly: Anomaly;
}

export interface AnomaliesByHost extends AnomaliesBy {
  hostName: string;
}

export type DestinationOrSource = 'source.ip' | 'destination.ip';

export interface AnomaliesByNetwork extends AnomaliesBy {
  type: DestinationOrSource;
  ip: string;
}

export interface AnomaliesByUser extends AnomaliesBy {
  userName: string;
}

export interface AnomaliesTableCommonProps {
  startDate: string;
  endDate: string;
  narrowDateRange: NarrowDateRange;
  skip: boolean;
}

export type AnomaliesHostTableProps = AnomaliesTableCommonProps & {
  hostName?: string;
  type: HostsType;
};

export type AnomaliesNetworkTableProps = AnomaliesTableCommonProps & {
  ip?: string;
  type: NetworkType;
  flowTarget?: FlowTarget;
};

export type AnomaliesUserTableProps = AnomaliesTableCommonProps & {
  userName?: string;
  type: UsersType;
};

const sourceOrDestination = ['source.ip', 'destination.ip'];

export const isDestinationOrSource = (value: string | null): value is DestinationOrSource =>
  value != null && sourceOrDestination.includes(value);

export interface MlError {
  msg: string;
  response: string;
  statusCode: number;
  path?: string;
  query?: {};
  body?: string;
}
