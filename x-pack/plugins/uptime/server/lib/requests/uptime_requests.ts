/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UMElasticsearchQueryFn } from '../adapters';
import {
  HistogramResult,
  Ping,
  PingsResponse,
  GetCertsParams,
  GetPingsParams,
  Cert,
  OverviewFilters,
  MonitorDetails,
  MonitorLocations,
  Snapshot,
  StatesIndexStatus,
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
import { GetMonitorStatesResult } from './get_monitor_states';
import { GetSnapshotCountParams } from './get_snapshot_counts';

type ESQ<P, R> = UMElasticsearchQueryFn<P, R>;

export interface UptimeRequests {
  getCerts: ESQ<GetCertsParams, Cert[]>;
  getFilterBar: ESQ<GetFilterBarParams, OverviewFilters>;
  getIndexPattern: ESQ<{}, {}>;
  getLatestMonitor: ESQ<GetLatestMonitorParams, Ping>;
  getMonitorDurationChart: ESQ<GetMonitorChartsParams, MonitorDurationResult>;
  getMonitorDetails: ESQ<GetMonitorDetailsParams, MonitorDetails>;
  getMonitorLocations: ESQ<GetMonitorLocationsParams, MonitorLocations>;
  getMonitorStates: ESQ<GetMonitorStatesParams, GetMonitorStatesResult>;
  getMonitorStatus: ESQ<GetMonitorStatusParams, GetMonitorStatusResult[]>;
  getPings: ESQ<GetPingsParams, PingsResponse>;
  getPingHistogram: ESQ<GetPingHistogramParams, HistogramResult>;
  getSnapshotCount: ESQ<GetSnapshotCountParams, Snapshot>;
  getIndexStatus: ESQ<{}, StatesIndexStatus>;
}
