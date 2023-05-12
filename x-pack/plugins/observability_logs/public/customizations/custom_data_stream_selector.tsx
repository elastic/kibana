/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { DiscoverStateContainer } from '@kbn/discover-plugin/public';
import { DataStream } from '../../common/integrations';
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
  const { integrations } = useIntegrationsContext();
  console.log({ integrations });

  const handleStreamSelection = (dataStream: DataStream) => {
    return stateContainer.actions.onCreateDefaultAdHocDataView(dataStream);
  };

  const [flag, setFlag] = useState(true);

  React.useEffect(() => {
    setTimeout(() => setFlag(false), 5000);
  }, []);

  return (
    <DataStreamSelector
      title={dataView.getName()}
      integrations={mockIntegrations}
      uncategorizedStreams={mockUncategorized}
      isSearching={false}
      isLoadingIntegrations={flag}
      isLoadingUncategorizedStreams
      onStreamSelected={handleStreamSelection}
      onUncategorizedClick={() => console.log('fetch uncategorized streams')}
    />
  );
});

// eslint-disable-next-line import/no-default-export
export default CustomDataStreamSelector;

const mockUncategorized = [{ name: 'metrics-*' }, { name: 'logs-*' }];

const mockIntegrations = [
  {
    name: 'atlassian_jira',
    version: '1.8.0',
    status: 'installed',
    dataStreams: [
      {
        name: 'Atlassian metrics stream',
        title: 'metrics-*',
      },
      {
        name: 'Atlassian secondary',
        title: 'metrics-*',
      },
    ],
  },
  {
    name: 'docker',
    version: '2.4.3',
    status: 'installed',
    dataStreams: [
      {
        name: 'Docker stream',
        title: 'metrics-*',
      },
    ],
  },
  {
    name: 'system',
    version: '1.27.1',
    status: 'installed',
    dataStreams: [
      {
        name: 'System metrics logs',
        title: 'metrics-*',
      },
    ],
  },
];

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
          <IntegrationsProvider integrationsClient={pluginStart.integrationsService.client}>
            <Component stateContainer={stateContainer} />
          </IntegrationsProvider>
        </InternalStateProvider>
      </ObservabilityLogsPluginProvider>
    );
  };
}
