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

export const selectIndexPattern = ({ indexPattern }: AppState) => indexPattern;

export const selectPingHistogram = ({ ping }: AppState) => ping;

export const selectPingList = ({ pingList }: AppState) => pingList;

export const snapshotDataSelector = ({ snapshot }: AppState) => snapshot;

const mlCapabilitiesSelector = (state: AppState) => state.ml.mlCapabilities.data;

export const hasMLFeatureSelector = createSelector(
  mlCapabilitiesSelector,
  (mlCapabilities) =>
    mlCapabilities?.isPlatinumOrTrialLicense && mlCapabilities?.mlFeatureEnabledInSpace
);

export const canCreateMLJobSelector = createSelector(
  mlCapabilitiesSelector,
  (mlCapabilities) => mlCapabilities?.capabilities.canCreateJob
);

export const canDeleteMLJobSelector = createSelector(
  mlCapabilitiesSelector,
  (mlCapabilities) => mlCapabilities?.capabilities.canDeleteJob
);

export const hasMLJobSelector = ({ ml }: AppState) => ml.mlJob;

export const hasNewMLJobSelector = ({ ml }: AppState) => ml.createJob;

export const isMLJobCreatingSelector = ({ ml }: AppState) => ml.createJob.loading;

export const isMLJobDeletingSelector = ({ ml }: AppState) => ml.deleteJob.loading;

export const isMLJobDeletedSelector = ({ ml }: AppState) => ml.deleteJob;

export const anomaliesSelector = ({ ml }: AppState) => ml.anomalies.data;

export const selectDurationLines = ({ monitorDuration }: AppState) => monitorDuration;

export const selectAlertFlyoutVisibility = ({ ui: { alertFlyoutVisible } }: AppState) =>
  alertFlyoutVisible;

export const selectAlertFlyoutType = ({ ui: { alertFlyoutType } }: AppState) => alertFlyoutType;

export const selectMonitorStatusAlert = ({ indexPattern, overviewFilters, ui }: AppState) => ({
  filters: ui.esKuery,
  indexPattern: indexPattern.index_pattern,
  locations: overviewFilters.filters.locations,
});

export const indexStatusSelector = ({ indexStatus }: AppState) => indexStatus.indexStatus;

export const monitorListSelector = ({ monitorList }: AppState) => monitorList;

export const overviewFiltersSelector = ({ overviewFilters }: AppState) => overviewFilters;

export const esKuerySelector = ({ ui: { esKuery } }: AppState) => esKuery;

export const searchTextSelector = ({ ui: { searchText } }: AppState) => searchText;

export const selectedFiltersSelector = ({ selectedFilters }: AppState) => selectedFilters;
