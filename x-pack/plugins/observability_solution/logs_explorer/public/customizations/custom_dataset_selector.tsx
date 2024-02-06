/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import { DiscoverStart } from '@kbn/discover-plugin/public';
import React from 'react';
import { DatasetSelector } from '../components/dataset_selector';
import { DatasetsProvider, useDatasetsContext } from '../hooks/use_datasets';
import { useDatasetSelection } from '../hooks/use_dataset_selection';
import { DataViewsProvider, useDataViewsContext } from '../hooks/use_data_views';
import { useEsql } from '../hooks/use_esql';
import { IntegrationsProvider, useIntegrationsContext } from '../hooks/use_integrations';
import { IDatasetsClient } from '../services/datasets';
import { LogsExplorerControllerStateService } from '../state_machines/logs_explorer_controller';

interface CustomDatasetSelectorProps {
  logsExplorerControllerStateService: LogsExplorerControllerStateService;
}

export const CustomDatasetSelector = withProviders(({ logsExplorerControllerStateService }) => {
  const { datasetSelection, handleDatasetSelectionChange } = useDatasetSelection(
    logsExplorerControllerStateService
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

  const { isEsqlEnabled, discoverEsqlUrlProps } = useEsql({ datasetSelection });

  return (
    <DatasetSelector
      datasets={datasets}
      datasetSelection={datasetSelection}
      datasetsError={datasetsError}
      dataViews={dataViews}
      dataViewsError={dataViewsError}
      discoverEsqlUrlProps={discoverEsqlUrlProps}
      integrations={integrations}
      integrationsError={integrationsError}
      isEsqlEnabled={isEsqlEnabled}
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
      onSelectionChange={handleDatasetSelectionChange}
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
    logsExplorerControllerStateService,
  }: CustomDatasetSelectorBuilderProps) {
    return (
      <IntegrationsProvider datasetsClient={datasetsClient}>
        <DatasetsProvider datasetsClient={datasetsClient}>
          <DataViewsProvider dataViewsService={dataViews} discoverService={discover}>
            <Component logsExplorerControllerStateService={logsExplorerControllerStateService} />
          </DataViewsProvider>
        </DatasetsProvider>
      </IntegrationsProvider>
    );
  };
}
