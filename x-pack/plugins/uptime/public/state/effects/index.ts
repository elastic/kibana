/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { fork } from 'redux-saga/effects';
import { fetchMonitorDetailsEffect } from './monitor';
import { fetchOverviewFiltersEffect } from './overview_filters';
import { fetchSnapshotCountEffect } from './snapshot';
import { fetchMonitorListEffect } from './monitor_list';
import { fetchMonitorStatusEffect } from './monitor_status';
import { fetchDynamicSettingsEffect, setDynamicSettingsEffect } from './dynamic_settings';
import { fetchIndexPatternEffect } from './index_pattern';
import { fetchPingsEffect, fetchPingHistogramEffect } from './ping';
import { fetchMonitorDurationEffect } from './monitor_duration';
import { fetchMLJobEffect } from './ml_anomaly';
import { fetchIndexStatusEffect } from './index_status';
import { fetchCertificatesEffect } from '../certificates/certificates';
import { fetchAlertsEffect } from './alerts';

export function* rootEffect() {
  yield fork(fetchMonitorDetailsEffect);
  yield fork(fetchSnapshotCountEffect);
  yield fork(fetchOverviewFiltersEffect);
  yield fork(fetchMonitorListEffect);
  yield fork(fetchMonitorStatusEffect);
  yield fork(fetchDynamicSettingsEffect);
  yield fork(setDynamicSettingsEffect);
  yield fork(fetchIndexPatternEffect);
  yield fork(fetchPingsEffect);
  yield fork(fetchPingHistogramEffect);
  yield fork(fetchMLJobEffect);
  yield fork(fetchMonitorDurationEffect);
  yield fork(fetchIndexStatusEffect);
  yield fork(fetchCertificatesEffect);
  yield fork(fetchAlertsEffect);
}
