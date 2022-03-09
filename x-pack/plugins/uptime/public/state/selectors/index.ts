/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createSelector } from 'reselect';
import type { AppState } from '../../state';

// UI Selectors
export const getBasePath = ({ ui: { basePath } }: AppState) => basePath;

export const isIntegrationsPopupOpen = ({ ui: { integrationsPopoverOpen } }: AppState) =>
  integrationsPopoverOpen;

// Monitor Selectors
export const monitorDetailsSelector = (state: AppState, summary: any) => {
  return state.monitor.monitorDetailsList[summary.monitor_id];
};

export const monitorDetailsLoadingSelector = (state: AppState) => state.monitor.loading;

export const monitorLocationsSelector = (state: AppState, monitorId: string) => {
  return state.monitor.monitorLocationsList?.get(monitorId);
};

export const monitorStatusSelector = (state: AppState) => state.monitorStatus.status;

export const selectDynamicSettings = (state: AppState) => state.dynamicSettings;

export const selectPingHistogram = ({ ping }: AppState) => ping;

export const selectPingList = ({ pingList }: AppState) => pingList;

export const mlCapabilitiesSelector = (state: AppState) => state.ml.mlCapabilities;

export const hasMLFeatureSelector = createSelector(
  mlCapabilitiesSelector,
  (mlCapabilities) =>
    mlCapabilities?.data?.isPlatinumOrTrialLicense && mlCapabilities?.data?.mlFeatureEnabledInSpace
);

export const canCreateMLJobSelector = createSelector(
  mlCapabilitiesSelector,
  (mlCapabilities) => mlCapabilities?.data?.capabilities?.canCreateJob
);

export const canDeleteMLJobSelector = createSelector(
  mlCapabilitiesSelector,
  (mlCapabilities) => mlCapabilities?.data?.capabilities?.canDeleteJob
);

export const hasMLJobSelector = ({ ml }: AppState) => ml.mlJob;

export const hasNewMLJobSelector = ({ ml }: AppState) => ml.createJob;

export const isMLJobCreatingSelector = ({ ml }: AppState) => ml.createJob.loading;

export const isMLJobDeletingSelector = ({ ml }: AppState) => ml.deleteJob.loading;
export const isAnomalyAlertDeletingSelector = ({ alerts }: AppState) =>
  alerts.alertDeletion.loading;

export const isMLJobDeletedSelector = ({ ml }: AppState) => ml.deleteJob;

export const anomaliesSelector = ({ ml }: AppState) => ml.anomalies.data;

export const selectDurationLines = ({ monitorDuration }: AppState) => monitorDuration;

export const selectAlertFlyoutVisibility = ({ ui: { alertFlyoutVisible } }: AppState) =>
  alertFlyoutVisible;

export const selectAlertFlyoutType = ({ ui: { alertFlyoutType } }: AppState) => alertFlyoutType;

export const indexStatusSelector = ({ indexStatus }: AppState) => indexStatus.indexStatus;

export const monitorListSelector = ({ monitorList }: AppState) => monitorList;

export const monitorManagementListSelector = ({ monitorManagementList }: AppState) =>
  monitorManagementList;

export const esKuerySelector = ({ ui: { esKuery } }: AppState) => esKuery;

export const searchTextSelector = ({ ui: { searchText } }: AppState) => searchText;

export const selectedFiltersSelector = ({ selectedFilters }: AppState) => selectedFilters;

export const monitorIdSelector = ({ ui: { monitorId } }: AppState) => monitorId;

export const journeySelector = ({ journeys }: AppState) => journeys;

export const networkEventsSelector = ({ networkEvents }: AppState) => networkEvents;

export const syntheticsSelector = ({ synthetics }: AppState) => synthetics;

export const uptimeWriteSelector = (state: AppState) => state;
