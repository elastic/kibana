/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { DiscoverStateContainer } from '@kbn/discover-plugin/public';
import { DataStream, SearchStrategy } from '../../common/data_streams';
import { DataStreamSelector, SearchHandler } from '../components/data_stream_selector';
import { InternalStateProvider, useDataView } from '../utils/internal_state_container_context';
import { IntegrationsProvider, useIntegrationsContext } from '../hooks/use_integrations';
import {
  ObservabilityLogsPluginProvider,
  ObservabilityLogsPluginProviderProps,
} from '../hooks/use_kibana';
import { DataStreamsProvider, useDataStreamsContext } from '../hooks/use_data_streams';

interface CustomDataStreamSelectorProps {
  stateContainer: DiscoverStateContainer;
}

export type DataStreamSelectionHandler = (stream: DataStream) => void;

export const CustomDataStreamSelector = withProviders(({ stateContainer }) => {
  // Container component, here goes all the state management and custom logic usage to keep the DataStreamSelector presentational.
  const dataView = useDataView();

  const {
    integrations,
    isLoading: isLoadingIntegrations,
    loadMore,
    search: integrationsSearch,
    searchIntegrations,
  } = useIntegrationsContext();

  const {
    dataStreams,
    error: dataStreamsError,
    isLoading: isLoadingStreams,
    loadDataStreams,
    reloadDataStreams,
    search: dataStreamsSearch,
    searchDataStreams,
  } = useDataStreamsContext();

  const handleStreamSelection: DataStreamSelectionHandler = (dataStream) => {
    return stateContainer.actions.onCreateDefaultAdHocDataView(dataStream);
  };

  const handleSearch: SearchHandler = (params) => {
    if (params.strategy === SearchStrategy.DATA_STREAMS) {
      return searchDataStreams({ name: params.name, sortOrder: params.sortOrder });
    } else {
      searchIntegrations(params);
    }
  };

  // TODO: handle search states for different strategies

  return (
    <DataStreamSelector
      dataStreams={dataStreams}
      dataStreamsError={dataStreamsError}
      integrations={integrations}
      isLoadingIntegrations={isLoadingIntegrations}
      isLoadingStreams={isLoadingStreams}
      onIntegrationsLoadMore={loadMore}
      onSearch={handleSearch}
      onStreamSelected={handleStreamSelection}
      onStreamsEntryClick={loadDataStreams}
      onStreamsReload={reloadDataStreams}
      search={integrationsSearch}
      title={dataView.getName()}
    />
  );
});

// eslint-disable-next-line import/no-default-export
export default CustomDataStreamSelector;

export type CustomDataStreamSelectorBuilderProps = ObservabilityLogsPluginProviderProps &
  CustomDataStreamSelectorProps;

function withProviders(Component: React.FunctionComponent<CustomDataStreamSelectorProps>) {
  return function ComponentWithProviders({
    core,
    plugins,
    pluginStart,
    stateContainer,
  }: CustomDataStreamSelectorBuilderProps) {
    return (
      <ObservabilityLogsPluginProvider core={core} plugins={plugins} pluginStart={pluginStart}>
        <InternalStateProvider value={stateContainer.internalState}>
          <IntegrationsProvider dataStreamsClient={pluginStart.dataStreamsService.client}>
            <DataStreamsProvider dataStreamsClient={pluginStart.dataStreamsService.client}>
              <Component stateContainer={stateContainer} />
            </DataStreamsProvider>
          </IntegrationsProvider>
        </InternalStateProvider>
      </ObservabilityLogsPluginProvider>
    );
  };
}
