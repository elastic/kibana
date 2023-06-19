/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { DiscoverStateContainer } from '@kbn/discover-plugin/public';
import { DatasetSelectionHandler, DatasetSelector } from '../components/dataset_selector';
import { DatasetsProvider, useDatasetsContext } from '../hooks/use_datasets';
import { InternalStateProvider, useDataView } from '../hooks/use_data_view';
import { IntegrationsProvider, useIntegrationsContext } from '../hooks/use_integrations';
import { IDatasetsClient } from '../services/datasets';

interface CustomDatasetSelectorProps {
  stateContainer: DiscoverStateContainer;
}

export const CustomDatasetSelector = withProviders(({ stateContainer }) => {
  // Container component, here goes all the state management and custom logic usage to keep the DatasetSelector presentational.
  const dataView = useDataView();

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

  /**
   * TODO: this action will be abstracted into a method of a class adapter in a follow-up PR
   * since we'll need to handle more actions from the stateContainer
   */
  const handleStreamSelection: DatasetSelectionHandler = (dataset) => {
    return stateContainer.actions.onCreateDefaultAdHocDataView({
      // Invert the property because the API returns the index pattern as `name`
      // and a readable name as `title`
      name: dataset.title,
      title: dataset.name,
    });
  };

  return (
    <DatasetSelector
      datasets={datasets}
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
      onStreamSelected={handleStreamSelection}
      onStreamsEntryClick={loadDatasets}
      onUnmanagedStreamsReload={reloadDatasets}
      onUnmanagedStreamsSearch={searchDatasets}
      onUnmanagedStreamsSort={sortDatasets}
      title={dataView.getName()}
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
    stateContainer,
    datasetsClient,
  }: CustomDatasetSelectorBuilderProps) {
    return (
      <InternalStateProvider value={stateContainer.internalState}>
        <IntegrationsProvider datasetsClient={datasetsClient}>
          <DatasetsProvider datasetsClient={datasetsClient}>
            <Component stateContainer={stateContainer} />
          </DatasetsProvider>
        </IntegrationsProvider>
      </InternalStateProvider>
    );
  };
}
