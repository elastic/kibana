/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable react-hooks/exhaustive-deps */

import React, { useState } from 'react';
import { DiscoverStateContainer } from '@kbn/discover-plugin/public';
import { DatasetSelector } from '../components/dataset_selector';
import { DatasetsProvider, useDatasetsContext } from '../hooks/use_datasets';
import { InternalStateProvider } from '../hooks/use_data_view';
import { IntegrationsProvider, useIntegrationsContext } from '../hooks/use_integrations';
import { IDatasetsClient } from '../services/datasets';
import {
  AllDatasetSelection,
  DatasetSelection,
  DatasetSelectionChange,
} from '../utils/dataset_selection';

interface CustomDatasetSelectorProps {
  stateContainer: DiscoverStateContainer;
}

export const CustomDatasetSelector = withProviders(({ stateContainer }) => {
  /**
   * TOREMOVE: This is a temporary workaround to control the datasetSelection value
   * until we handle the restore/initialization of the dataview with https://github.com/elastic/kibana/issues/160425,
   * where this value will be used to control the DatasetSelector selection with a top level state machine.
   */
  const [datasetSelection, setDatasetSelection] = useState<DatasetSelection>(() =>
    AllDatasetSelection.create()
  );

  // Restore All dataset selection on refresh until restore from url is not available
  React.useEffect(() => handleStreamSelection(datasetSelection), []);

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
  const handleStreamSelection: DatasetSelectionChange = (nextDatasetSelection) => {
    setDatasetSelection(nextDatasetSelection);
    return stateContainer.actions.onCreateDefaultAdHocDataView(
      nextDatasetSelection.toDataviewSpec()
    );
  };

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
      onSelectionChange={handleStreamSelection}
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
