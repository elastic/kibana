/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { DiscoverStateContainer } from '@kbn/discover-plugin/public';
import { DataStream, SearchStrategy } from '../../common/data_streams';
import { DataStreamSelector, SearchHandler } from '../components/data_stream_selector';
import { InternalStateProvider, useDataView } from '../utils/internal_state_container_context';
import { IntegrationsProvider, useIntegrationsContext } from '../hooks/use_integrations';
import { DataStreamsProvider, useDataStreamsContext } from '../hooks/use_data_streams';
import { IDataStreamsClient } from '../services/data_streams';

interface CustomDataStreamSelectorProps {
  stateContainer: DiscoverStateContainer;
}

export type DataStreamSelectionHandler = (stream: DataStream) => void;

export const CustomDataStreamSelector = withProviders(({ stateContainer }) => {
  // Container component, here goes all the state management and custom logic usage to keep the DataStreamSelector presentational.
  const dataView = useDataView();

  const {
    error: integrationsError,
    integrations,
    isLoading: isLoadingIntegrations,
    loadMore,
    reloadIntegrations,
    searchIntegrations,
  } = useIntegrationsContext();

  const {
    dataStreams,
    error: dataStreamsError,
    isLoading: isLoadingStreams,
    loadDataStreams,
    reloadDataStreams,
    searchDataStreams,
  } = useDataStreamsContext();

  const handleStreamSelection: DataStreamSelectionHandler = (dataStream) => {
    return stateContainer.actions.onCreateDefaultAdHocDataView({
      // Invert the property because the API returns the index pattern as `name`
      // and a readable name as `title`
      name: dataStream.title,
      title: dataStream.name,
    });
  };

  const handleSearch: SearchHandler = useCallback(
    (params) => {
      if (params.strategy === SearchStrategy.DATA_STREAMS) {
        return searchDataStreams({ name: params.name, sortOrder: params.sortOrder });
      } else {
        searchIntegrations(params);
      }
    },
    [searchDataStreams, searchIntegrations]
  );

  return (
    <DataStreamSelector
      dataStreams={dataStreams}
      dataStreamsError={dataStreamsError}
      integrations={integrations}
      integrationsError={integrationsError}
      isLoadingIntegrations={isLoadingIntegrations}
      isLoadingStreams={isLoadingStreams}
      onIntegrationsLoadMore={loadMore}
      onIntegrationsReload={reloadIntegrations}
      onSearch={handleSearch}
      onStreamSelected={handleStreamSelection}
      onStreamsEntryClick={loadDataStreams}
      onStreamsReload={reloadDataStreams}
      title={dataView.getName()}
    />
  );
});

// eslint-disable-next-line import/no-default-export
export default CustomDataStreamSelector;

export type CustomDataStreamSelectorBuilderProps = CustomDataStreamSelectorProps & {
  dataStreamsClient: IDataStreamsClient;
};

function withProviders(Component: React.FunctionComponent<CustomDataStreamSelectorProps>) {
  return function ComponentWithProviders({
    stateContainer,
    dataStreamsClient,
  }: CustomDataStreamSelectorBuilderProps) {
    return (
      <InternalStateProvider value={stateContainer.internalState}>
        <IntegrationsProvider dataStreamsClient={dataStreamsClient}>
          <DataStreamsProvider dataStreamsClient={dataStreamsClient}>
            <Component stateContainer={stateContainer} />
          </DataStreamsProvider>
        </IntegrationsProvider>
      </InternalStateProvider>
    );
  };
}
