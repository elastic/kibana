/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { all, fork } from 'redux-saga/effects';
import { fetchMonitorStatusEffect, fetchSyntheticsMonitorEffect } from './monitor_summary';
import { fetchIndexStatusEffect } from './index_status';
import { fetchSyntheticsEnablementEffect } from './synthetics_enablement';
import { fetchMonitorListEffect, upsertMonitorEffect } from './monitor_list';
import { fetchMonitorOverviewEffect, quietFetchOverviewEffect } from './overview';
import { fetchServiceLocationsEffect } from './service_locations';

export const rootEffect = function* root(): Generator {
  yield all([
    fork(fetchIndexStatusEffect),
    fork(fetchSyntheticsEnablementEffect),
    fork(upsertMonitorEffect),
    fork(fetchServiceLocationsEffect),
    fork(fetchMonitorListEffect),
    fork(fetchMonitorStatusEffect),
    fork(fetchSyntheticsMonitorEffect),
    fork(fetchMonitorOverviewEffect),
    fork(quietFetchOverviewEffect),
  ]);
};
