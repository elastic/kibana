/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import { DiscoverStart } from '@kbn/discover-plugin/public';
import { DatasetSelection } from '@kbn/log-explorer-plugin/common';
import {
  DatasetSelector,
  DatasetsProvider,
  useDatasetsContext,
  DataViewsProvider,
  useDataViewsContext,
  IntegrationsProvider,
  useIntegrationsContext,
  IDatasetsClient,
  useEsql,
} from '@kbn/log-explorer-plugin/public';

interface CustomDatasetSelectorProps {
  selectedDataset: DatasetSelection;
  onSelectionChange: (datasetSelection: DatasetSelection) => void;
}

export const CustomDatasetSelector = withProviders(({ selectedDataset, onSelectionChange }) => {
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
    isLoading: isLoadingUncategorized,
    loadDatasets,
    reloadDatasets,
    searchDatasets,
    sortDatasets,
  } = useDatasetsContext();

  const {
    dataViews,
    error: dataViewsError,
    isLoading: isLoadingDataViews,
    loadDataViews,
    reloadDataViews,
    selectDataView,
    searchDataViews,
    sortDataViews,
  } = useDataViewsContext();

  const { discoverEsqlUrlProps } = useEsql({ datasetSelection: selectedDataset });

  return (
    <DatasetSelector
      datasets={datasets}
      datasetSelection={selectedDataset}
      datasetsError={datasetsError}
      dataViews={dataViews}
      dataViewsError={dataViewsError}
      discoverEsqlUrlProps={discoverEsqlUrlProps}
      hideDataViews
      integrations={integrations}
      integrationsError={integrationsError}
      isEsqlEnabled={false}
      isLoadingDataViews={isLoadingDataViews}
      isLoadingIntegrations={isLoadingIntegrations}
      isLoadingUncategorized={isLoadingUncategorized}
      isSearchingIntegrations={isSearchingIntegrations}
      onDataViewSelection={selectDataView}
      onDataViewsReload={reloadDataViews}
      onDataViewsSearch={searchDataViews}
      onDataViewsSort={sortDataViews}
      onDataViewsTabClick={loadDataViews}
      onIntegrationsLoadMore={loadMore}
      onIntegrationsReload={reloadIntegrations}
      onIntegrationsSearch={searchIntegrations}
      onIntegrationsSort={sortIntegrations}
      onIntegrationsStreamsSearch={searchIntegrationsStreams}
      onIntegrationsStreamsSort={sortIntegrationsStreams}
      onSelectionChange={onSelectionChange}
      onUncategorizedReload={reloadDatasets}
      onUncategorizedSearch={searchDatasets}
      onUncategorizedSort={sortDatasets}
      onUncategorizedTabClick={loadDatasets}
    />
  );
});

// eslint-disable-next-line import/no-default-export
export default CustomDatasetSelector;

export type CustomDatasetSelectorBuilderProps = CustomDatasetSelectorProps & {
  datasetsClient: IDatasetsClient;
  dataViews: DataViewsPublicPluginStart;
  discover: DiscoverStart;
};

function withProviders(Component: React.FunctionComponent<CustomDatasetSelectorProps>) {
  return function ComponentWithProviders({
    datasetsClient,
    dataViews,
    discover,
    selectedDataset,
    onSelectionChange,
  }: CustomDatasetSelectorBuilderProps) {
    return (
      <IntegrationsProvider datasetsClient={datasetsClient}>
        <DatasetsProvider datasetsClient={datasetsClient}>
          <DataViewsProvider dataViewsService={dataViews} discoverService={discover}>
            <Component selectedDataset={selectedDataset} onSelectionChange={onSelectionChange} />
          </DataViewsProvider>
        </DatasetsProvider>
      </IntegrationsProvider>
    );
  };
}
