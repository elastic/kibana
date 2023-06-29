/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { DiscoverStateContainer } from '@kbn/discover-plugin/public';
import { Dataset } from '../../common/datasets/models/dataset';
import { DatasetSelectionHandler, DatasetSelector } from '../components/dataset_selector';
import { DatasetsProvider, useDatasetsContext } from '../hooks/use_datasets';
import { InternalStateProvider } from '../hooks/use_data_view';
import { IntegrationsProvider, useIntegrationsContext } from '../hooks/use_integrations';
import { IDatasetsClient } from '../services/datasets';

interface CustomDatasetSelectorProps {
  stateContainer: DiscoverStateContainer;
}

export const CustomDatasetSelector = withProviders(({ stateContainer }) => {
  const initialSelected: Dataset = Dataset.createAllLogsDataset();

  /**
   * TODO: This is a workaround to set the initial data view to the initialSelected value
   * until we handle the restore/initialization of the dataview with https://github.com/elastic/kibana/issues/160425,
   * where this value will be used to control the DatasetSelector selection.
   */
  // eslint-disable-next-line react-hooks/exhaustive-deps
  React.useEffect(() => handleStreamSelection(initialSelected), []);

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
    return stateContainer.actions.onCreateDefaultAdHocDataView(dataset.toDataviewSpec());
  };

  return (
    <DatasetSelector
      datasets={datasets}
      datasetsError={datasetsError}
      initialSelected={initialSelected}
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
      onDatasetSelected={handleStreamSelection}
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
