/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { all, fork } from 'redux-saga/effects';
import {
  enableDefaultAlertingEffect,
  enableDefaultAlertingSilentlyEffect,
  getDefaultAlertingEffect,
  updateDefaultAlertingEffect,
} from './alert_rules/effects';
import { browserJourneyEffects, fetchJourneyStepsEffect } from './browser_journey';
import { getCertsListEffect } from './certs';
import { executeEsQueryEffect } from './elasticsearch';
import { addGlobalParamEffect, editGlobalParamEffect, getGlobalParamEffect } from './global_params';
import { fetchManualTestRunsEffect } from './manual_test_runs/effects';
import { fetchSyntheticsMonitorEffect } from './monitor_details';
import {
  enableMonitorAlertEffect,
  fetchMonitorFiltersEffect,
  fetchMonitorListEffect,
  upsertMonitorEffect,
} from './monitor_list';
import { fetchNetworkEventsEffect } from './network_events/effects';
import { fetchMonitorOverviewEffect } from './overview';
import { fetchOverviewStatusEffect } from './overview_status';
import { fetchPingStatusesEffect } from './ping_status';
import { fetchAgentPoliciesEffect, fetchPrivateLocationsEffect } from './private_locations';
import { fetchServiceLocationsEffect } from './service_locations';
import { syncGlobalParamsEffect } from './settings';
import {
  fetchAlertConnectorsEffect,
  fetchDynamicSettingsEffect,
  fetchLocationMonitorsEffect,
  setDynamicSettingsEffect,
} from './settings/effects';
import { fetchSyntheticsEnablementEffect } from './synthetics_enablement';

export const rootEffect = function* root(): Generator {
  yield all([
    fork(fetchSyntheticsEnablementEffect),
    fork(upsertMonitorEffect),
    fork(fetchMonitorFiltersEffect),
    fork(fetchServiceLocationsEffect),
    fork(fetchMonitorListEffect),
    fork(fetchSyntheticsMonitorEffect),
    fork(fetchMonitorOverviewEffect),
    fork(browserJourneyEffects),
    fork(fetchOverviewStatusEffect),
    fork(fetchNetworkEventsEffect),
    fork(fetchPingStatusesEffect),
    fork(fetchAgentPoliciesEffect),
    fork(fetchPrivateLocationsEffect),
    fork(fetchDynamicSettingsEffect),
    fork(fetchLocationMonitorsEffect),
    fork(setDynamicSettingsEffect),
    fork(fetchAlertConnectorsEffect),
    fork(syncGlobalParamsEffect),
    fork(enableDefaultAlertingEffect),
    fork(enableMonitorAlertEffect),
    fork(updateDefaultAlertingEffect),
    fork(executeEsQueryEffect),
    fork(fetchJourneyStepsEffect),
    fork(fetchManualTestRunsEffect),
    fork(addGlobalParamEffect),
    fork(editGlobalParamEffect),
    fork(getGlobalParamEffect),
    fork(getCertsListEffect),
    fork(getDefaultAlertingEffect),
    fork(enableDefaultAlertingSilentlyEffect),
  ]);
};
