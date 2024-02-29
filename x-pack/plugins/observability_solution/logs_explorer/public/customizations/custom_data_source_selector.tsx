/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import React from 'react';
import { DataSourceSelector } from '../components/data_source_selector';
import { LogsExplorerController } from '../controller';
import { DatasetsProvider, useDatasetsContext } from '../hooks/use_datasets';
import { useDataSourceSelection } from '../hooks/use_data_source_selection';
import { DataViewsProvider, useDataViewsContext } from '../hooks/use_data_views';
import { useEsql } from '../hooks/use_esql';
import { IntegrationsProvider, useIntegrationsContext } from '../hooks/use_integrations';
import { IDatasetsClient } from '../services/datasets';
import { LogsExplorerControllerStateService } from '../state_machines/logs_explorer_controller';

interface CustomDataSourceSelectorProps {
  logsExplorerControllerStateService: LogsExplorerControllerStateService;
}

export const CustomDataSourceSelector = withProviders(({ logsExplorerControllerStateService }) => {
  const { dataSourceSelection, handleDataSourceSelectionChange } = useDataSourceSelection(
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
    isDataViewAvailable,
    loadDataViews,
    reloadDataViews,
    searchDataViews,
    sortDataViews,
  } = useDataViewsContext();

  const { isEsqlEnabled, discoverEsqlUrlProps } = useEsql({ dataSourceSelection });

  return (
    <DataSourceSelector
      datasets={datasets}
      dataSourceSelection={dataSourceSelection}
      datasetsError={datasetsError}
      dataViews={dataViews}
      dataViewsError={dataViewsError}
      discoverEsqlUrlProps={discoverEsqlUrlProps}
      isDataViewAvailable={isDataViewAvailable}
      integrations={integrations}
      integrationsError={integrationsError}
      isEsqlEnabled={isEsqlEnabled}
      isLoadingDataViews={isLoadingDataViews}
      isLoadingIntegrations={isLoadingIntegrations}
      isLoadingUncategorized={isLoadingUncategorized}
      isSearchingIntegrations={isSearchingIntegrations}
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
      onSelectionChange={handleDataSourceSelectionChange}
      onUncategorizedReload={reloadDatasets}
      onUncategorizedSearch={searchDatasets}
      onUncategorizedSort={sortDatasets}
      onUncategorizedTabClick={loadDatasets}
    />
  );
});

// eslint-disable-next-line import/no-default-export
export default CustomDataSourceSelector;

export type CustomDataSourceSelectorBuilderProps = CustomDataSourceSelectorProps & {
  controller: LogsExplorerController;
  datasetsClient: IDatasetsClient;
  dataViews: DataViewsPublicPluginStart;
};

function withProviders(Component: React.FunctionComponent<CustomDataSourceSelectorProps>) {
  return function ComponentWithProviders({
    controller,
    datasetsClient,
    dataViews,
    logsExplorerControllerStateService,
  }: CustomDataSourceSelectorBuilderProps) {
    return (
      <IntegrationsProvider datasetsClient={datasetsClient}>
        <DatasetsProvider datasetsClient={datasetsClient}>
          <DataViewsProvider
            dataViewsService={dataViews}
            events={controller.customizations?.events}
          >
            <Component logsExplorerControllerStateService={logsExplorerControllerStateService} />
          </DataViewsProvider>
        </DatasetsProvider>
      </IntegrationsProvider>
    );
  };
}
