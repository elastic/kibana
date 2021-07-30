/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Story } from '@storybook/react';
import cytoscape from 'cytoscape';
import { CoreStart } from 'kibana/public';
import React, { ComponentType } from 'react';
import { Popover } from '.';
import { createKibanaReactContext } from '../../../../../../../../src/plugins/kibana_react/public';
import { MockApmPluginContextWrapper } from '../../../../context/apm_plugin/mock_apm_plugin_context';
import { MockUrlParamsContextProvider } from '../../../../context/url_params_context/mock_url_params_context_provider';
import { createCallApmApi } from '../../../../services/rest/createCallApmApi';
import { CytoscapeContext } from '../Cytoscape';
import exampleGroupedConnectionsData from '../__stories__/example_grouped_connections.json';

interface Args {
  nodeData: cytoscape.NodeDataDefinition;
}

export default {
  title: 'app/ServiceMap/Popover',
  component: Popover,
  decorators: [
    (StoryComponent: ComponentType) => {
      const coreMock = ({
        http: {
          get: () => {
            return {
              avgCpuUsage: 0.32809666568309237,
              avgErrorRate: 0.556068173242986,
              avgMemoryUsage: 0.5504868173242986,
              transactionStats: {
                avgRequestsPerMinute: 164.47222031860858,
                avgTransactionDuration: 61634.38905590272,
              },
            };
          },
        },
        notifications: { toasts: { add: () => {} } },
        uiSettings: { get: () => ({}) },
      } as unknown) as CoreStart;

      const KibanaReactContext = createKibanaReactContext(coreMock);

      createCallApmApi(coreMock);

      return (
        <KibanaReactContext.Provider>
          <MockUrlParamsContextProvider>
            <MockApmPluginContextWrapper>
              <div style={{ height: 325 }}>
                <StoryComponent />
              </div>
            </MockApmPluginContextWrapper>
          </MockUrlParamsContextProvider>
        </KibanaReactContext.Provider>
      );
    },
    (StoryComponent: ComponentType, { args: { nodeData } }: { args: Args }) => {
      const node = {
        data: nodeData,
      };

      const cy = cytoscape({ elements: [node] });

      setTimeout(() => {
        cy.$id(node.data.id!).select();
      }, 0);

      return (
        <CytoscapeContext.Provider value={cy}>
          <StoryComponent />
        </CytoscapeContext.Provider>
      );
    },
  ],
};

export const Service: Story<Args> = () => {
  return <Popover />;
};
Service.args = {
  nodeData: { id: 'example service', 'service.name': 'example service' },
};

export const Backend: Story<Args> = () => {
  return <Popover />;
};
Backend.args = {
  nodeData: {
    'span.subtype': 'postgresql',
    'span.destination.service.resource': 'postgresql',
    'span.type': 'db',
    id: '>postgresql',
    label: 'postgresql',
  },
};

export const Externals: Story<Args> = () => {
  return <Popover />;
};
Externals.args = {
  nodeData: exampleGroupedConnectionsData,
};
