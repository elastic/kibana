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
import { ServiceNode } from '../service_node';
import { MockApmPluginStorybook } from '../../../../context/apm_plugin/mock_apm_plugin_storybook';
import type { ServiceNodeData } from '../../../../../common/service_map';
import { ServiceMapSearchProvider } from '../../../shared/service_map/service_map_search_context';
import { WithSearchHighlight } from './search_highlight_helper';

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
          <ServiceMapSearchProvider>
            <div style={{ padding: 40, display: 'flex', justifyContent: 'center' }}>
              <Story />
            </div>
          </ServiceMapSearchProvider>
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

export const AllAnomalyScores: StoryObj = {
  render: () => (
    <div style={{ display: 'flex', gap: 48, flexWrap: 'wrap' }}>
      <div style={{ textAlign: 'center' }}>
        <ServiceNode
          {...createNodeProps({
            id: 'no-score',
            label: 'No anomaly score',
            isService: true,
            agentName: 'java',
          })}
        />
        <LabelText>No anomaly score</LabelText>
      </div>
      <div style={{ textAlign: 'center' }}>
        <ServiceNode
          {...createNodeProps({
            id: 'low',
            label: 'low-severity-service',
            isService: true,
            agentName: 'nodejs',
            serviceAnomalyStats: {
              transactionType: 'request',
              anomalyScore: 1,
            },
          })}
        />
        <LabelText>LOW (0–3)</LabelText>
      </div>
      <div style={{ textAlign: 'center' }}>
        <ServiceNode
          {...createNodeProps({
            id: 'warning',
            label: 'warning-service',
            isService: true,
            agentName: 'python',
            serviceAnomalyStats: {
              transactionType: 'request',
              anomalyScore: 10,
            },
          })}
        />
        <LabelText>WARNING (3–25)</LabelText>
      </div>
      <div style={{ textAlign: 'center' }}>
        <ServiceNode
          {...createNodeProps({
            id: 'minor',
            label: 'minor-service',
            isService: true,
            agentName: 'go',
            serviceAnomalyStats: {
              transactionType: 'request',
              anomalyScore: 35,
            },
          })}
        />
        <LabelText>MINOR (25–50)</LabelText>
      </div>
      <div style={{ textAlign: 'center' }}>
        <ServiceNode
          {...createNodeProps({
            id: 'major',
            label: 'major-service',
            isService: true,
            agentName: 'dotnet',
            serviceAnomalyStats: {
              transactionType: 'request',
              anomalyScore: 65,
            },
          })}
        />
        <LabelText>MAJOR (50–75)</LabelText>
      </div>
      <div style={{ textAlign: 'center' }}>
        <ServiceNode
          {...createNodeProps({
            id: 'critical',
            label: 'critical-service',
            isService: true,
            agentName: 'ruby',
            serviceAnomalyStats: {
              transactionType: 'request',
              anomalyScore: 85,
            },
          })}
        />
        <LabelText>CRITICAL (75–100)</LabelText>
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

export const AlertBadges: StoryObj = {
  render: () => (
    <div style={{ display: 'flex', gap: 48, flexWrap: 'wrap' }}>
      <div style={{ textAlign: 'center' }}>
        <ServiceNode
          {...createNodeProps({
            id: 'single-alert',
            label: 'single-alert',
            isService: true,
            agentName: 'java',
            alertsCount: 1,
          })}
        />
        <LabelText>1 active alert</LabelText>
      </div>
      <div style={{ textAlign: 'center' }}>
        <ServiceNode
          {...createNodeProps({
            id: 'multiple-alerts',
            label: 'multiple-alerts',
            isService: true,
            agentName: 'nodejs',
            alertsCount: 5,
          })}
        />
        <LabelText>5 active alerts</LabelText>
      </div>
      <div style={{ textAlign: 'center' }}>
        <ServiceNode
          {...createNodeProps({
            id: 'many-alerts',
            label: 'many-alerts',
            isService: true,
            agentName: 'python',
            alertsCount: 23,
          })}
        />
        <LabelText>23 active alerts</LabelText>
      </div>
      <div style={{ textAlign: 'center' }}>
        <ServiceNode
          {...createNodeProps({
            id: 'no-alerts',
            label: 'no-alerts',
            isService: true,
            agentName: 'go',
            alertsCount: 0,
          })}
        />
        <LabelText>0 alerts (hidden)</LabelText>
      </div>
    </div>
  ),
};

export const SloBadges: StoryObj = {
  render: () => (
    <div style={{ display: 'flex', gap: 48, flexWrap: 'wrap' }}>
      <div style={{ textAlign: 'center' }}>
        <ServiceNode
          {...createNodeProps({
            id: 'slo-violated',
            label: 'slo-violated',
            isService: true,
            agentName: 'java',
            sloStatus: 'violated',
            sloCount: 2,
          })}
        />
        <LabelText>Violated (2 SLOs)</LabelText>
      </div>
      <div style={{ textAlign: 'center' }}>
        <ServiceNode
          {...createNodeProps({
            id: 'slo-degrading',
            label: 'slo-degrading',
            isService: true,
            agentName: 'nodejs',
            sloStatus: 'degrading',
            sloCount: 3,
          })}
        />
        <LabelText>Degrading (3 SLOs)</LabelText>
      </div>
      <div style={{ textAlign: 'center' }}>
        <ServiceNode
          {...createNodeProps({
            id: 'slo-healthy',
            label: 'slo-healthy',
            isService: true,
            agentName: 'python',
            sloStatus: 'healthy',
            sloCount: 5,
          })}
        />
        <LabelText>Healthy (hidden on map)</LabelText>
      </div>
      <div style={{ textAlign: 'center' }}>
        <ServiceNode
          {...createNodeProps({
            id: 'slo-no-data',
            label: 'slo-no-data',
            isService: true,
            agentName: 'go',
            sloStatus: 'noData',
            sloCount: 1,
          })}
        />
        <LabelText>No data (hidden on map)</LabelText>
      </div>
    </div>
  ),
};

export const AlertAndSloCombined: StoryObj = {
  render: () => (
    <div style={{ display: 'flex', gap: 48, flexWrap: 'wrap' }}>
      <div style={{ textAlign: 'center' }}>
        <ServiceNode
          {...createNodeProps({
            id: 'alerts-and-violated',
            label: 'alerts-and-violated',
            isService: true,
            agentName: 'java',
            alertsCount: 3,
            sloStatus: 'violated',
            sloCount: 1,
          })}
        />
        <LabelText>Alerts + Violated SLO</LabelText>
      </div>
      <div style={{ textAlign: 'center' }}>
        <ServiceNode
          {...createNodeProps({
            id: 'alerts-and-degrading',
            label: 'alerts-and-degrading',
            isService: true,
            agentName: 'nodejs',
            alertsCount: 2,
            sloStatus: 'degrading',
            sloCount: 4,
          })}
        />
        <LabelText>Alerts + Degrading SLOs</LabelText>
      </div>
      <div style={{ textAlign: 'center' }}>
        <ServiceNode
          {...createNodeProps({
            id: 'alerts-anomaly-slo',
            label: 'alerts-anomaly-slo',
            isService: true,
            agentName: 'python',
            alertsCount: 7,
            sloStatus: 'violated',
            sloCount: 2,
            serviceAnomalyStats: {
              transactionType: 'request',
              anomalyScore: 85,
            },
          })}
        />
        <LabelText>Alerts + SLO + Critical anomaly</LabelText>
      </div>
    </div>
  ),
};

export const HighlightStates: StoryObj = {
  render: () => (
    <div style={{ display: 'flex', gap: 48, flexWrap: 'wrap' }}>
      <div style={{ textAlign: 'center' }}>
        <ServiceNode
          {...createNodeProps({
            id: 'no-highlight',
            label: 'no-highlight',
            isService: true,
            agentName: 'java',
          })}
        />
        <LabelText>No highlight</LabelText>
      </div>
      <div style={{ textAlign: 'center' }}>
        <ServiceNode
          {...createNodeProps({
            id: 'context-highlight',
            label: 'context-highlight',
            isService: true,
            agentName: 'nodejs',
            contextHighlight: true,
          })}
        />
        <LabelText>Context highlight</LabelText>
      </div>
      <div style={{ textAlign: 'center' }}>
        <WithSearchHighlight
          matchNodeIds={new Set(['search-overrides'])}
          activeMatchNodeId="search-overrides"
        >
          <ServiceNode
            {...createNodeProps({
              id: 'search-overrides',
              label: 'search-overrides',
              isService: true,
              agentName: 'go',
            })}
          />
        </WithSearchHighlight>
        <LabelText>Search overrides context</LabelText>
      </div>
    </div>
  ),
};
