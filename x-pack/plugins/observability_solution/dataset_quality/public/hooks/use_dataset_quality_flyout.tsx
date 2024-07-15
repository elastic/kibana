/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useSelector } from '@xstate/react';
import { useDatasetQualityContext } from '../components/dataset_quality/context';
import { useKibanaContextForPlugin } from '../utils';

export const useDatasetQualityFlyout = () => {
  const {
    services: { fieldFormats },
  } = useKibanaContextForPlugin();

  const { service } = useDatasetQualityContext();

  const {
    dataset: dataStreamStat,
    datasetSettings: dataStreamSettings,
    datasetDetails: dataStreamDetails,
    insightsTimeRange,
    breakdownField,
    isNonAggregatable,
    integration,
  } = useSelector(service, (state) => state.context.flyout) ?? {};

  const { timeRange } = useSelector(service, (state) => state.context.filters);

  const loadingState = useSelector(service, (state) => ({
    dataStreamDetailsLoading: state.matches('flyout.initializing.dataStreamDetails.fetching'),
    dataStreamSettingsLoading: state.matches('flyout.initializing.dataStreamSettings.fetching'),
    datasetIntegrationDashboardLoading: state.matches(
      'flyout.initializing.dataStreamSettings.initializeIntegrations.integrationDashboards.fetching'
    ),
    datasetIntegrationDone: state.matches(
      'flyout.initializing.dataStreamSettings.initializeIntegrations.integrationDetails.done'
    ),
  }));

  const canUserAccessDashboards = useSelector(
    service,
    (state) =>
      !state.matches(
        'flyout.initializing.dataStreamSettings.initializeIntegrations.integrationDashboards.unauthorized'
      )
  );

  const canUserViewIntegrations = useSelector(
    service,
    (state) => state.context.datasetUserPrivileges.canViewIntegrations
  );

  return {
    dataStreamStat,
    dataStreamSettings,
    dataStreamDetails,
    isNonAggregatable,
    integration,
    fieldFormats,
    timeRange: insightsTimeRange ?? timeRange,
    breakdownField,
    loadingState,
    flyoutLoading: !dataStreamStat,
    canUserAccessDashboards,
    canUserViewIntegrations,
  };
};
