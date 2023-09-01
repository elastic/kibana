/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { ObserverCodec } from '../ping/observer';
import { ErrorStateCodec } from '../ping/error_state';
import { AgentType, MonitorType, PingErrorType, UrlType } from '..';

export const OverviewPingCodec = t.intersection([
  t.interface({
    '@timestamp': t.string,
    summary: t.partial({
      down: t.number,
      up: t.number,
    }),
    monitor: MonitorType,
    observer: ObserverCodec,
    config_id: t.string,
    agent: AgentType,
    url: UrlType,
    state: ErrorStateCodec,
  }),
  t.partial({
    error: PingErrorType,
  }),
]);

export const OverviewStatusMetaDataCodec = t.interface({
  monitorQueryId: t.string,
  configId: t.string,
  status: t.string,
  locationId: t.string,
  timestamp: t.string,
  ping: OverviewPingCodec,
});

export const OverviewPendingStatusMetaDataCodec = t.intersection([
  t.interface({
    monitorQueryId: t.string,
    configId: t.string,
    status: t.string,
    location: t.string,
  }),
  t.partial({
    timestamp: t.string,
    ping: OverviewPingCodec,
  }),
]);

export const OverviewStatusCodec = t.interface({
  allMonitorsCount: t.number,
  disabledMonitorsCount: t.number,
  projectMonitorsCount: t.number,
  up: t.number,
  down: t.number,
  pending: t.number,
  disabledCount: t.number,
  upConfigs: t.record(t.string, OverviewStatusMetaDataCodec),
  downConfigs: t.record(t.string, OverviewStatusMetaDataCodec),
  pendingConfigs: t.record(t.string, OverviewPendingStatusMetaDataCodec),
  enabledMonitorQueryIds: t.array(t.string),
  disabledMonitorQueryIds: t.array(t.string),
  allIds: t.array(t.string),
});

export const OverviewStatusStateCodec = t.intersection([
  OverviewStatusCodec,
  t.interface({
    allConfigs: t.record(t.string, OverviewStatusMetaDataCodec),
  }),
]);

export type OverviewPing = t.TypeOf<typeof OverviewPingCodec>;
export type OverviewStatus = t.TypeOf<typeof OverviewStatusCodec>;
export type OverviewStatusState = t.TypeOf<typeof OverviewStatusStateCodec>;
export type OverviewStatusMetaData = t.TypeOf<typeof OverviewStatusMetaDataCodec>;
export type OverviewPendingStatusMetaData = t.TypeOf<typeof OverviewPendingStatusMetaDataCodec>;
