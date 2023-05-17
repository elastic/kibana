/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { DiscoverStateContainer } from '@kbn/discover-plugin/public';
import { DataStream } from '../../common/data_streams';
import { DataStreamSelector } from '../components/data_stream_selector';
import { InternalStateProvider, useDataView } from '../utils/internal_state_container_context';
import { IntegrationsProvider, useIntegrationsContext } from '../hooks/use_integrations';
import {
  ObservabilityLogsPluginProvider,
  ObservabilityLogsPluginProviderProps,
} from '../hooks/use_kibana';

interface CustomDataStreamSelectorProps {
  stateContainer: DiscoverStateContainer;
}

export const CustomDataStreamSelector = withProviders(({ stateContainer }) => {
  // Container component, here goes all the state management and custom logic usage to keep the DataStreamSelector presentational.
  const dataView = useDataView();
  const { integrations, isLoading, loadMore, search, searchIntegrations } =
    useIntegrationsContext();

  const handleStreamSelection = (dataStream: DataStream) => {
    return stateContainer.actions.onCreateDefaultAdHocDataView(dataStream);
  };

  return (
    <DataStreamSelector
      integrations={integrations}
      isLoadingIntegrations={isLoading}
      isLoadingUncategorizedStreams={false}
      onIntegrationsSearch={searchIntegrations}
      onLoadMore={loadMore}
      onStreamSelected={handleStreamSelection}
      onUncategorizedClick={() => console.log('fetch uncategorized streams')}
      search={search}
      title={dataView.getName()}
      uncategorizedStreams={[]}
    />
  );
});

// eslint-disable-next-line import/no-default-export
export default CustomDataStreamSelector;

const mockUncategorized = [{ name: 'metrics-*' }, { name: 'logs-*' }];

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
            <Component stateContainer={stateContainer} />
          </IntegrationsProvider>
        </InternalStateProvider>
      </ObservabilityLogsPluginProvider>
    );
  };
}
