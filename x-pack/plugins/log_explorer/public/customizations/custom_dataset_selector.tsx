/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { DatasetSelector } from '../components/dataset_selector';
import { DatasetsProvider, useDatasetsContext } from '../hooks/use_datasets';
import { IntegrationsProvider, useIntegrationsContext } from '../hooks/use_integrations';
import { IDatasetsClient } from '../services/datasets';
import { LogExplorerProfileStateService } from '../state_machines/log_explorer_profile';
import { useDatasetSelection } from '../hooks/use_dataset_selection';

interface CustomDatasetSelectorProps {
  logExplorerProfileStateService: LogExplorerProfileStateService;
}

export const CustomDatasetSelector = withProviders(({ logExplorerProfileStateService }) => {
  const { datasetSelection, handleDatasetSelectionChange } = useDatasetSelection(
    logExplorerProfileStateService
  );

  const {
    error: integrationsError,
    integrations,
    isLoading: isLoadingIntegrations,
    loadMore,
    reloadIntegrations,
    searchIntegrations,
    searchIntegrationsStreams,
    sortIntegrations,
    sortIntegrationsStreams,
  } = useIntegrationsContext();

  const {
    datasets,
    error: datasetsError,
    isLoading: isLoadingStreams,
    loadDatasets,
    reloadDatasets,
    searchDatasets,
    sortDatasets,
  } = useDatasetsContext();

  return (
    <DatasetSelector
      datasets={datasets}
      datasetSelection={datasetSelection}
      datasetsError={datasetsError}
      integrations={integrations}
      integrationsError={integrationsError}
      isLoadingIntegrations={isLoadingIntegrations}
      isLoadingStreams={isLoadingStreams}
      onIntegrationsLoadMore={loadMore}
      onIntegrationsReload={reloadIntegrations}
      onIntegrationsSearch={searchIntegrations}
      onIntegrationsSort={sortIntegrations}
      onIntegrationsStreamsSearch={searchIntegrationsStreams}
      onIntegrationsStreamsSort={sortIntegrationsStreams}
      onSelectionChange={handleDatasetSelectionChange}
      onStreamsEntryClick={loadDatasets}
      onUnmanagedStreamsReload={reloadDatasets}
      onUnmanagedStreamsSearch={searchDatasets}
      onUnmanagedStreamsSort={sortDatasets}
    />
  );
});

// eslint-disable-next-line import/no-default-export
export default CustomDatasetSelector;

export type CustomDatasetSelectorBuilderProps = CustomDatasetSelectorProps & {
  datasetsClient: IDatasetsClient;
};

function withProviders(Component: React.FunctionComponent<CustomDatasetSelectorProps>) {
  return function ComponentWithProviders({
    logExplorerProfileStateService,
    datasetsClient,
  }: CustomDatasetSelectorBuilderProps) {
    return (
      <IntegrationsProvider datasetsClient={datasetsClient}>
        <DatasetsProvider datasetsClient={datasetsClient}>
          <Component logExplorerProfileStateService={logExplorerProfileStateService} />
        </DatasetsProvider>
      </IntegrationsProvider>
    );
  };
}
