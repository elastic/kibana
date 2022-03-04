/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fork } from 'redux-saga/effects';
import { fetchMonitorDetailsEffect } from './monitor';
import {
  fetchMonitorListEffect,
  fetchRunNowMonitorEffect,
  fetchUpdatedMonitorEffect,
} from './monitor_list';
import { fetchMonitorManagementEffect } from './monitor_management';
import { fetchMonitorStatusEffect } from './monitor_status';
import { fetchDynamicSettingsEffect, setDynamicSettingsEffect } from './dynamic_settings';
import { fetchPingsEffect, fetchPingHistogramEffect } from './ping';
import { fetchMonitorDurationEffect } from './monitor_duration';
import { fetchMLJobEffect } from './ml_anomaly';
import { fetchIndexStatusEffect } from './index_status';
import { fetchAlertsEffect } from '../alerts/alerts';
import { fetchJourneyStepsEffect } from './journey';
import { fetchNetworkEventsEffect } from './network_events';
import {
  fetchScreenshotBlocks,
  generateBlockStatsOnPut,
  pruneBlockCache,
} from './synthetic_journey_blocks';

export function* rootEffect() {
  yield fork(fetchMonitorDetailsEffect);
  yield fork(fetchMonitorListEffect);
  yield fork(fetchUpdatedMonitorEffect);
  yield fork(fetchMonitorManagementEffect);
  yield fork(fetchMonitorStatusEffect);
  yield fork(fetchDynamicSettingsEffect);
  yield fork(setDynamicSettingsEffect);
  yield fork(fetchPingsEffect);
  yield fork(fetchPingHistogramEffect);
  yield fork(fetchMLJobEffect);
  yield fork(fetchMonitorDurationEffect);
  yield fork(fetchIndexStatusEffect);
  yield fork(fetchAlertsEffect);
  yield fork(fetchJourneyStepsEffect);
  yield fork(fetchNetworkEventsEffect);
  yield fork(fetchScreenshotBlocks);
  yield fork(generateBlockStatsOnPut);
  yield fork(pruneBlockCache);
  yield fork(fetchRunNowMonitorEffect);
}
