/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { all, fork } from 'redux-saga/effects';
import { fetchManualTestRunsEffect } from './manual_test_runs/effects';
import { enableDefaultAlertingEffect, updateDefaultAlertingEffect } from './alert_rules/effects';
import { executeEsQueryEffect } from './elasticsearch';
import {
  fetchAlertConnectorsEffect,
  fetchDynamicSettingsEffect,
  setDynamicSettingsEffect,
} from './settings/effects';
import { syncGlobalParamsEffect } from './settings';
import { fetchAgentPoliciesEffect } from './private_locations';
import { fetchNetworkEventsEffect } from './network_events/effects';
import { fetchSyntheticsMonitorEffect } from './monitor_details';
import { fetchSyntheticsEnablementEffect } from './synthetics_enablement';
import {
  enableMonitorAlertEffect,
  fetchMonitorListEffect,
  upsertMonitorEffect,
} from './monitor_list';
import { fetchMonitorOverviewEffect, fetchOverviewStatusEffect } from './overview';
import { fetchServiceLocationsEffect } from './service_locations';
import { browserJourneyEffects, fetchJourneyStepsEffect } from './browser_journey';
import { fetchPingStatusesEffect } from './ping_status';

export const rootEffect = function* root(): Generator {
  yield all([
    fork(fetchSyntheticsEnablementEffect),
    fork(upsertMonitorEffect),
    fork(fetchServiceLocationsEffect),
    fork(fetchMonitorListEffect),
    fork(fetchSyntheticsMonitorEffect),
    fork(fetchMonitorOverviewEffect),
    fork(browserJourneyEffects),
    fork(fetchOverviewStatusEffect),
    fork(fetchNetworkEventsEffect),
    fork(fetchPingStatusesEffect),
    fork(fetchAgentPoliciesEffect),
    fork(fetchDynamicSettingsEffect),
    fork(setDynamicSettingsEffect),
    fork(fetchAgentPoliciesEffect),
    fork(fetchAlertConnectorsEffect),
    fork(syncGlobalParamsEffect),
    fork(enableDefaultAlertingEffect),
    fork(enableMonitorAlertEffect),
    fork(updateDefaultAlertingEffect),
    fork(executeEsQueryEffect),
    fork(fetchJourneyStepsEffect),
    fork(fetchManualTestRunsEffect),
  ]);
};
