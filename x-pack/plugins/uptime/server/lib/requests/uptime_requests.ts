/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UMElasticsearchQueryFn } from '../adapters';
import {
  OverviewFilters,
  MonitorDetails,
  MonitorLocations,
  Snapshot,
  StatesIndexStatus,
  HistogramResult,
  Ping,
  PingsResponse,
  GetCertsParams,
  GetPingsParams,
  CertResult,
  MonitorSummariesResult,
} from '../../../common/runtime_types';
import { MonitorDurationResult } from '../../../common/types';

import {
  GetFilterBarParams,
  GetLatestMonitorParams,
  GetMonitorChartsParams,
  GetMonitorDetailsParams,
  GetMonitorLocationsParams,
  GetMonitorStatesParams,
  GetPingHistogramParams,
  GetMonitorStatusParams,
  GetMonitorStatusResult,
} from '.';
import { GetSnapshotCountParams } from './get_snapshot_counts';
import { IIndexPattern } from '../../../../../../src/plugins/data/server';

type ESQ<P, R> = UMElasticsearchQueryFn<P, R>;

export interface UptimeRequests {
  getCerts: ESQ<GetCertsParams, CertResult>;
  getFilterBar: ESQ<GetFilterBarParams, OverviewFilters>;
  getIndexPattern: ESQ<{}, IIndexPattern | undefined>;
  getLatestMonitor: ESQ<GetLatestMonitorParams, Ping>;
  getMonitorDurationChart: ESQ<GetMonitorChartsParams, MonitorDurationResult>;
  getMonitorDetails: ESQ<GetMonitorDetailsParams, MonitorDetails>;
  getMonitorLocations: ESQ<GetMonitorLocationsParams, MonitorLocations>;
  getMonitorStates: ESQ<GetMonitorStatesParams, MonitorSummariesResult>;
  getMonitorStatus: ESQ<GetMonitorStatusParams, GetMonitorStatusResult[]>;
  getPings: ESQ<GetPingsParams, PingsResponse>;
  getPingHistogram: ESQ<GetPingHistogramParams, HistogramResult>;
  getSnapshotCount: ESQ<GetSnapshotCountParams, Snapshot>;
  getIndexStatus: ESQ<{}, StatesIndexStatus>;
}
