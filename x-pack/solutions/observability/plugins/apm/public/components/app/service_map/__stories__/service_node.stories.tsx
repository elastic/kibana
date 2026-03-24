/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { ReactFlowProvider } from '@xyflow/react';
import { useEuiTheme } from '@elastic/eui';
import type { ElasticAgentName, OpenTelemetryAgentName } from '@kbn/apm-types';
import { MockApmPluginStorybook } from '../../../../context/apm_plugin/mock_apm_plugin_storybook';
import { ServiceNode } from '../service_node';
import type { ServiceNodeData } from '../../../../../common/service_map';
import { ServiceHealthStatus } from '../../../../../common/service_health_status';

const LabelText = ({ children }: { children: React.ReactNode }) => {
  const { euiTheme } = useEuiTheme();
  return (
    <div style={{ marginTop: 8, fontSize: 12, color: euiTheme.colors.textSubdued }}>{children}</div>
  );
};

const meta: Meta<typeof ServiceNode> = {
  title: 'app/ServiceMap/ServiceNode',
  component: ServiceNode,
  decorators: [
    (Story) => (
      <MockApmPluginStorybook routePath="/service-map?rangeFrom=now-15m&rangeTo=now">
        <ReactFlowProvider>
          <div style={{ padding: 40, display: 'flex', justifyContent: 'center' }}>
            <Story />
          </div>
        </ReactFlowProvider>
      </MockApmPluginStorybook>
    ),
  ],
  parameters: {
    layout: 'centered',
    a11y: {
      config: {
        rules: [
          { id: 'color-contrast', enabled: true },
          { id: 'image-alt', enabled: true },
        ],
      },
    },
  },
  argTypes: {
    selected: {
      control: 'boolean',
      description: 'Whether the node is selected',
    },
  },
};

export default meta;
type Story = StoryObj<typeof ServiceNode>;

const createNodeProps = (data: ServiceNodeData, selected = false) => ({
  id: data.id,
  data,
  selected,
  type: 'service' as const,
  positionAbsoluteX: 0,
  positionAbsoluteY: 0,
  zIndex: 0,
  isConnectable: false,
  dragging: false,
  draggable: true,
  deletable: false,
  selectable: true,
  parentId: undefined,
  sourcePosition: undefined,
  targetPosition: undefined,
});

export const Default: Story = {
  args: createNodeProps({
    id: 'opbeans-java',
    label: 'opbeans-java',
    isService: true,
    agentName: 'java',
  }),
};

export const Selected: Story = {
  args: createNodeProps(
    {
      id: 'opbeans-node',
      label: 'opbeans-node',
      isService: true,
      agentName: 'nodejs',
    },
    true
  ),
};

export const LongServiceName: Story = {
  args: createNodeProps({
    id: 'very-long-service-name-that-should-be-truncated',
    label: 'very-long-service-name-that-should-be-truncated',
    isService: true,
    agentName: 'java',
  }),
};

export const NoAgentIcon: Story = {
  args: createNodeProps({
    id: 'unknown-service',
    label: 'unknown-service',
    isService: true,
    agentName: undefined,
  }),
};

export const AllHealthStatuses: StoryObj = {
  render: () => (
    <div style={{ display: 'flex', gap: 48, flexWrap: 'wrap' }}>
      <div style={{ textAlign: 'center' }}>
        <ServiceNode
          {...createNodeProps({
            id: 'no-status',
            label: 'No Status',
            isService: true,
            agentName: 'java',
          })}
        />
        <LabelText>No Status</LabelText>
      </div>
      <div style={{ textAlign: 'center' }}>
        <ServiceNode
          {...createNodeProps({
            id: 'healthy',
            label: 'healthy-service',
            isService: true,
            agentName: 'nodejs',
            serviceAnomalyStats: {
              healthStatus: ServiceHealthStatus.healthy,
              transactionType: 'request',
            },
          })}
        />
        <LabelText>Healthy</LabelText>
      </div>
      <div style={{ textAlign: 'center' }}>
        <ServiceNode
          {...createNodeProps({
            id: 'warning',
            label: 'warning-service',
            isService: true,
            agentName: 'python',
            serviceAnomalyStats: {
              healthStatus: ServiceHealthStatus.warning,
              transactionType: 'request',
              anomalyScore: 50,
            },
          })}
        />
        <LabelText>Warning</LabelText>
      </div>
      <div style={{ textAlign: 'center' }}>
        <ServiceNode
          {...createNodeProps({
            id: 'critical',
            label: 'critical-service',
            isService: true,
            agentName: 'ruby',
            serviceAnomalyStats: {
              healthStatus: ServiceHealthStatus.critical,
              transactionType: 'request',
              anomalyScore: 85,
            },
          })}
        />
        <LabelText>Critical</LabelText>
      </div>
    </div>
  ),
};

export const AllAgentTypes: StoryObj = {
  render: () => {
    const elasticAgents: ElasticAgentName[] = [
      'java',
      'nodejs',
      'python',
      'go',
      'ruby',
      'dotnet',
      'php',
      'rum-js',
      'js-base',
      'iOS/swift',
      'android/java',
    ];
    return (
      <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
        {elasticAgents.map((agent) => (
          <div key={agent} style={{ textAlign: 'center' }}>
            <ServiceNode
              {...createNodeProps({
                id: agent,
                label: `${agent}-service`,
                isService: true,
                agentName: agent,
              })}
            />
            <LabelText>{agent}</LabelText>
          </div>
        ))}
      </div>
    );
  },
};

export const OpenTelemetryAgents: StoryObj = {
  render: () => {
    const otelAgents: OpenTelemetryAgentName[] = [
      'opentelemetry/java',
      'opentelemetry/nodejs',
      'opentelemetry/python',
      'opentelemetry/go',
      'opentelemetry/dotnet',
      'opentelemetry/php',
      'opentelemetry/ruby',
      'opentelemetry/swift',
      'opentelemetry/android',
      'otlp',
    ];
    return (
      <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
        {otelAgents.map((agent) => (
          <div key={agent} style={{ textAlign: 'center' }}>
            <ServiceNode
              {...createNodeProps({
                id: agent,
                label: agent.replace('opentelemetry/', 'otel-'),
                isService: true,
                agentName: agent,
              })}
            />
            <LabelText>{agent.split('/').pop()}</LabelText>
          </div>
        ))}
      </div>
    );
  },
};
