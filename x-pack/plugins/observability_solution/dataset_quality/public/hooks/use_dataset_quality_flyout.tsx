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
  } = useSelector(service, (state) => state.context.flyout) ?? {};

  const { timeRange } = useSelector(service, (state) => state.context.filters);

  const loadingState = useSelector(service, (state) => ({
    dataStreamDetailsLoading: state.matches('flyout.initializing.dataStreamDetails.fetching'),
    dataStreamSettingsLoading: state.matches('flyout.initializing.dataStreamSettings.fetching'),
    datasetIntegrationsLoading: state.matches('flyout.initializing.integrationDashboards.fetching'),
  }));

  return {
    dataStreamStat,
    dataStreamSettings,
    dataStreamDetails,
    fieldFormats,
    timeRange: insightsTimeRange ?? timeRange,
    breakdownField,
    loadingState,
    flyoutLoading: !dataStreamStat,
  };
};
