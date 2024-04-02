/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Meta, Story } from '@storybook/react';
import cytoscape from 'cytoscape';
import React from 'react';
import { Popover } from '.';
import { ENVIRONMENT_ALL } from '../../../../../common/environment_filter_values';
import { MockApmPluginStorybook } from '../../../../context/apm_plugin/mock_apm_plugin_storybook';
import { mockApmApiCallResponse } from '../../../../services/rest/call_apm_api_spy';
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
      mockApmApiCallResponse('GET /internal/apm/service-map/dependency', () => {
        return {
          currentPeriod: {
            cpuUsage: { value: 0.32809666568309237 },
            failedTransactionsRate: { value: 0.556068173242986 },
            memoryUsage: { value: 0.5504868173242986 },
            transactionStats: {
              latency: {
                value: 61634.38905590272,
              },
              throughput: {
                value: 164.47222031860858,
              },
            },
          },
          previousPeriod: {},
        };
      });

      return (
        <MockApmPluginStorybook routePath="/service-map?rangeFrom=now-15m&rangeTo=now&comparisonEnabled=true&offset=1d">
          <div style={{ height: 325 }}>
            <StoryComponent />
          </div>
        </MockApmPluginStorybook>
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

export const Dependency: Story<Args> = () => {
  return (
    <Popover
      environment={ENVIRONMENT_ALL.value}
      kuery=""
      start="2021-08-20T10:00:00.000Z"
      end="2021-08-20T10:15:00.000Z"
    />
  );
};
Dependency.args = {
  nodeData: {
    'span.subtype': 'postgresql',
    'span.destination.service.resource': 'postgresql',
    'span.type': 'db',
    id: '>postgresql',
    label: 'postgresql',
  },
};

export const DependencyWithLongTitle: Story<Args> = () => {
  return (
    <Popover
      environment={ENVIRONMENT_ALL.value}
      kuery=""
      start="2021-08-20T10:00:00.000Z"
      end="2021-08-20T10:15:00.000Z"
    />
  );
};
DependencyWithLongTitle.args = {
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
