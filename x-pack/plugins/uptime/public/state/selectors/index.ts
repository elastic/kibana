/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createSelector } from 'reselect';
import { AppState } from '../../state';

// UI Selectors
export const getBasePath = ({ ui: { basePath } }: AppState) => basePath;

export const isIntegrationsPopupOpen = ({ ui: { integrationsPopoverOpen } }: AppState) =>
  integrationsPopoverOpen;

// Monitor Selectors
export const monitorDetailsSelector = (state: AppState, summary: any) => {
  return state.monitor.monitorDetailsList[summary.monitor_id];
};

export const monitorLocationsSelector = (state: AppState, monitorId: string) => {
  return state.monitor.monitorLocationsList?.get(monitorId);
};

export const monitorStatusSelector = (state: AppState) => state.monitorStatus.status;

export const selectDynamicSettings = (state: AppState) => state.dynamicSettings;

export const selectIndexPattern = ({ indexPattern }: AppState) => {
  return { indexPattern: indexPattern.index_pattern, loading: indexPattern.loading };
};

export const selectPingHistogram = ({ ping, ui }: AppState) => {
  return {
    data: ping.pingHistogram,
    loading: ping.loading,
    lastRefresh: ui.lastRefresh,
    esKuery: ui.esKuery,
  };
};

export const selectPingList = ({ pingList, ui: { lastRefresh } }: AppState) => ({
  pings: pingList,
  lastRefresh,
});

export const snapshotDataSelector = ({
  snapshot: { count, loading },
  ui: { lastRefresh, esKuery },
}: AppState) => ({
  count,
  lastRefresh,
  loading,
  esKuery,
});

const mlCapabilitiesSelector = (state: AppState) => state.ml.mlCapabilities.data;

export const hasMLFeatureAvailable = createSelector(
  mlCapabilitiesSelector,
  mlCapabilities =>
    mlCapabilities?.isPlatinumOrTrialLicense && mlCapabilities?.mlFeatureEnabledInSpace
);

export const canCreateMLJobSelector = createSelector(
  mlCapabilitiesSelector,
  mlCapabilities => mlCapabilities?.capabilities.canCreateJob
);

export const canDeleteMLJobSelector = createSelector(
  mlCapabilitiesSelector,
  mlCapabilities => mlCapabilities?.capabilities.canDeleteJob
);

export const hasMLJobSelector = ({ ml }: AppState) => ml.mlJob;

export const hasNewMLJobSelector = ({ ml }: AppState) => ml.createJob;

export const isMLJobCreatingSelector = ({ ml }: AppState) => ml.createJob.loading;

export const isMLJobDeletingSelector = ({ ml }: AppState) => ml.deleteJob.loading;

export const isMLJobDeletedSelector = ({ ml }: AppState) => ml.deleteJob;

export const anomaliesSelector = ({ ml }: AppState) => ml.anomalies.data;

export const selectDurationLines = ({ monitorDuration }: AppState) => {
  return monitorDuration;
};

export const selectAlertFlyoutVisibility = ({ ui: { alertFlyoutVisible } }: AppState) =>
  alertFlyoutVisible;

export const selectMonitorStatusAlert = ({ indexPattern, overviewFilters, ui }: AppState) => ({
  filters: ui.esKuery,
  indexPattern: indexPattern.index_pattern,
  locations: overviewFilters.filters.locations,
});

export const indexStatusSelector = ({ indexStatus }: AppState) => {
  return indexStatus.indexStatus;
};

export const monitorListSelector = ({ monitorList, ui: { lastRefresh } }: AppState) => ({
  monitorList,
  lastRefresh,
});
