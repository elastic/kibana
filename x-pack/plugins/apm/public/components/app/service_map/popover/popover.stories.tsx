/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Meta, Story } from '@storybook/react';
import cytoscape from 'cytoscape';
import { CoreStart } from 'kibana/public';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { Popover } from '.';
import { createKibanaReactContext } from '../../../../../../../../src/plugins/kibana_react/public';
import { ENVIRONMENT_ALL } from '../../../../../common/environment_filter_values';
import { MockApmPluginContextWrapper } from '../../../../context/apm_plugin/mock_apm_plugin_context';
import { MockUrlParamsContextProvider } from '../../../../context/url_params_context/mock_url_params_context_provider';
import { createCallApmApi } from '../../../../services/rest/create_call_apm_api';
import { CytoscapeContext } from '../cytoscape';
import exampleGroupedConnectionsData from '../__stories__/example_grouped_connections.json';

interface Args {
  nodeData: cytoscape.NodeDataDefinition;
}

const stories: Meta<Args> = {
  title: 'app/ServiceMap/popover',
  component: Popover,
  decorators: [
    (StoryComponent) => {
      const coreMock = {
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
      } as unknown as CoreStart;

      const KibanaReactContext = createKibanaReactContext(coreMock);

      createCallApmApi(coreMock);

      return (
        <MemoryRouter
          initialEntries={['/service-map?rangeFrom=now-15m&rangeTo=now']}
        >
          <KibanaReactContext.Provider>
            <MockUrlParamsContextProvider>
              <MockApmPluginContextWrapper>
                <div style={{ height: 325 }}>
                  <StoryComponent />
                </div>
              </MockApmPluginContextWrapper>
            </MockUrlParamsContextProvider>
          </KibanaReactContext.Provider>
        </MemoryRouter>
      );
    },
    (StoryComponent, { args }) => {
      const node = {
        data: args?.nodeData!,
      };

      const cy = cytoscape({
        elements: [
          { data: { id: 'upstreamService' } },
          {
            data: {
              id: 'edge',
              source: 'upstreamService',
              target: node.data.id,
            },
          },
          node,
        ],
      });

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
export default stories;

export const Backend: Story<Args> = () => {
  return (
    <Popover
      environment={ENVIRONMENT_ALL.value}
      kuery=""
      start="2021-08-20T10:00:00.000Z"
      end="2021-08-20T10:15:00.000Z"
    />
  );
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

export const BackendWithLongTitle: Story<Args> = () => {
  return (
    <Popover
      environment={ENVIRONMENT_ALL.value}
      kuery=""
      start="2021-08-20T10:00:00.000Z"
      end="2021-08-20T10:15:00.000Z"
    />
  );
};
BackendWithLongTitle.args = {
  nodeData: {
    'span.subtype': 'http',
    'span.destination.service.resource':
      '8b37cb7ca2ae49ada54db165f32d3a19.us-central1.gcp.foundit.no:9243',
    'span.type': 'external',
    id: '>8b37cb7ca2ae49ada54db165f32d3a19.us-central1.gcp.foundit.no:9243',
    label: '8b37cb7ca2ae49ada54db165f32d3a19.us-central1.gcp.foundit.no:9243',
  },
};

export const ExternalsList: Story<Args> = () => {
  return (
    <Popover
      environment={ENVIRONMENT_ALL.value}
      kuery=""
      start="2021-08-20T10:00:00.000Z"
      end="2021-08-20T10:15:00.000Z"
    />
  );
};
ExternalsList.args = {
  nodeData: exampleGroupedConnectionsData,
};

export const Resource: Story<Args> = () => {
  return (
    <Popover
      environment={ENVIRONMENT_ALL.value}
      kuery=""
      start="2021-08-20T10:00:00.000Z"
      end="2021-08-20T10:15:00.000Z"
    />
  );
};
Resource.args = {
  nodeData: {
    id: '>cdn.loom.com:443',
    label: 'cdn.loom.com:443',
    'span.destination.service.resource': 'cdn.loom.com:443',
    'span.subtype': 'css',
    'span.type': 'resource',
  },
};

export const Service: Story<Args> = () => {
  return (
    <Popover
      environment={ENVIRONMENT_ALL.value}
      kuery=""
      start="2021-08-20T10:00:00.000Z"
      end="2021-08-20T10:15:00.000Z"
    />
  );
};
Service.args = {
  nodeData: {
    id: 'example service',
    'service.name': 'example service',
    serviceAnomalyStats: {
      serviceName: 'opbeans-java',
      jobId: 'apm-production-802c-high_mean_transaction_duration',
      transactionType: 'request',
      actualValue: 16258.496000000017,
      anomalyScore: 0,
      healthStatus: 'healthy',
    },
  },
};
