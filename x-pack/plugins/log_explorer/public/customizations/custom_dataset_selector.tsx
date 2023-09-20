/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import { DatasetSelector } from '../components/dataset_selector';
import { DatasetsProvider, useDatasetsContext } from '../hooks/use_datasets';
import { IntegrationsProvider, useIntegrationsContext } from '../hooks/use_integrations';
import { IDatasetsClient } from '../services/datasets';
import { LogExplorerProfileStateService } from '../state_machines/log_explorer_profile';
import { useDatasetSelection } from '../hooks/use_dataset_selection';
import { DataViewsProvider } from '../hooks/use_data_views';

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
    isSearching: isSearchingIntegrations,
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

  // const { dataViews, loadDataViews } = useDataViewsContext();

  // console.log(dataViews);

  return (
    <DatasetSelector
      datasets={datasets}
      datasetSelection={datasetSelection}
      datasetsError={datasetsError}
      integrations={integrations}
      integrationsError={integrationsError}
      isLoadingIntegrations={isLoadingIntegrations}
      isLoadingStreams={isLoadingStreams}
      isSearchingIntegrations={isSearchingIntegrations}
      onIntegrationsLoadMore={loadMore}
      onIntegrationsReload={reloadIntegrations}
      onIntegrationsSearch={searchIntegrations}
      onIntegrationsSort={sortIntegrations}
      onIntegrationsStreamsSearch={searchIntegrationsStreams}
      onIntegrationsStreamsSort={sortIntegrationsStreams}
      onSelectionChange={handleDatasetSelectionChange}
      onStreamsEntryClick={loadDatasets}
      onUncategorizedReload={reloadDatasets}
      onUncategorizedSearch={searchDatasets}
      onUncategorizedSort={sortDatasets}
    />
  );
});

// eslint-disable-next-line import/no-default-export
export default CustomDatasetSelector;

export type CustomDatasetSelectorBuilderProps = CustomDatasetSelectorProps & {
  datasetsClient: IDatasetsClient;
  dataViews: DataViewsPublicPluginStart;
};

function withProviders(Component: React.FunctionComponent<CustomDatasetSelectorProps>) {
  return function ComponentWithProviders({
    datasetsClient,
    dataViews,
    logExplorerProfileStateService,
  }: CustomDatasetSelectorBuilderProps) {
    return (
      <IntegrationsProvider datasetsClient={datasetsClient}>
        <DatasetsProvider datasetsClient={datasetsClient}>
          <DataViewsProvider dataViews={dataViews}>
            <Component logExplorerProfileStateService={logExplorerProfileStateService} />
          </DataViewsProvider>
        </DatasetsProvider>
      </IntegrationsProvider>
    );
  };
}
