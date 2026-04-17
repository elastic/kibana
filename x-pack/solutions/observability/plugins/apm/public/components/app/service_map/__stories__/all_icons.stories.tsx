/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { StoryObj } from '@storybook/react';
import { ReactFlowProvider } from '@xyflow/react';
import { useEuiTheme, EuiTitle } from '@elastic/eui';
import type { ElasticAgentName, OpenTelemetryAgentName } from '@kbn/apm-types';
import { MockApmPluginStorybook } from '../../../../context/apm_plugin/mock_apm_plugin_storybook';
import { DependencyNode } from '../dependency_node';
import { ServiceNode } from '../service_node';
import { GroupedResourcesNode } from '../grouped_resources_node';
import type { DependencyNodeData, ServiceNodeData, GroupedNodeData } from '../../../../../common/service_map';
import { ServiceHealthStatus } from '../../../../../common/service_health_status';

export default {
  title: 'app/ServiceMap/AllIcons',
  decorators: [
    (Story: React.ComponentType) => (
      <MockApmPluginStorybook routePath="/service-map?rangeFrom=now-15m&rangeTo=now">
        <ReactFlowProvider>
          <div style={{ padding: 40 }}>
            <Story />
          </div>
        </ReactFlowProvider>
      </MockApmPluginStorybook>
    ),
  ],
  parameters: {
    layout: 'fullscreen',
  },
};

const LabelText = ({ children }: { children: React.ReactNode }) => {
  const { euiTheme } = useEuiTheme();
  return (
    <div style={{ marginTop: 8, fontSize: 12, color: euiTheme.colors.textSubdued, textAlign: 'center' }}>
      {children}
    </div>
  );
};

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <EuiTitle size="xs">
    <h3 style={{ marginBottom: 16 }}>{children}</h3>
  </EuiTitle>
);

const Section = ({ children }: { children: React.ReactNode }) => (
  <div style={{ marginBottom: 40 }}>{children}</div>
);

const IconRow = ({ children }: { children: React.ReactNode }) => (
  <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap', alignItems: 'flex-start' }}>
    {children}
  </div>
);

const createDependencyNodeProps = (data: DependencyNodeData, selected = false) => ({
  id: data.id,
  data,
  selected,
  type: 'dependency' as const,
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

const createServiceNodeProps = (data: ServiceNodeData, selected = false) => ({
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

const createGroupedNodeProps = (data: GroupedNodeData, selected = false) => ({
  id: data.id,
  data,
  selected,
  type: 'groupedResources' as const,
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

export const AllIcons: StoryObj = {
  name: 'All icons',
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

    const databases = [
      { subtype: 'elasticsearch', label: 'elasticsearch' },
      { subtype: 'postgresql', label: 'postgresql' },
      { subtype: 'mysql', label: 'mysql' },
      { subtype: 'mongodb', label: 'mongodb' },
      { subtype: 'redis', label: 'redis' },
      { subtype: 'cassandra', label: 'cassandra' },
    ];

    const messaging = [
      { subtype: 'kafka', label: 'kafka' },
      { subtype: 'rabbitmq', label: 'rabbitmq' },
      { subtype: 'sns', label: 'sns' },
      { subtype: 'sqs', label: 'sqs' },
    ];

    const externals = [
      { subtype: 'http', label: 'http', spanType: 'external' },
      { subtype: 'grpc', label: 'grpc', spanType: 'external' },
      { subtype: 'graphql', label: 'graphql', spanType: 'external' },
    ];

    return (
      <>
        <Section>
          <SectionTitle>Elastic agents</SectionTitle>
          <IconRow>
            {elasticAgents.map((agent) => (
              <div key={agent} style={{ textAlign: 'center' }}>
                <ServiceNode
                  {...createServiceNodeProps({
                    id: agent,
                    label: agent,
                    isService: true,
                    agentName: agent,
                  })}
                />
                <LabelText>{agent}</LabelText>
              </div>
            ))}
          </IconRow>
        </Section>

        <Section>
          <SectionTitle>OpenTelemetry agents</SectionTitle>
          <IconRow>
            {otelAgents.map((agent) => (
              <div key={agent} style={{ textAlign: 'center' }}>
                <ServiceNode
                  {...createServiceNodeProps({
                    id: agent,
                    label: agent,
                    isService: true,
                    agentName: agent,
                  })}
                />
                <LabelText>{agent.split('/').pop()}</LabelText>
              </div>
            ))}
          </IconRow>
        </Section>

        <Section>
          <SectionTitle>No agent / unknown</SectionTitle>
          <IconRow>
            <div style={{ textAlign: 'center' }}>
              <ServiceNode
                {...createServiceNodeProps({
                  id: 'unknown-service',
                  label: 'unknown-service',
                  isService: true,
                  agentName: undefined,
                })}
              />
              <LabelText>unknown</LabelText>
            </div>
          </IconRow>
        </Section>

        <Section>
          <SectionTitle>Health statuses</SectionTitle>
          <IconRow>
            <div style={{ textAlign: 'center' }}>
              <ServiceNode
                {...createServiceNodeProps({
                  id: 'no-status',
                  label: 'No Status',
                  isService: true,
                  agentName: 'java',
                })}
              />
              <LabelText>No status</LabelText>
            </div>
            <div style={{ textAlign: 'center' }}>
              <ServiceNode
                {...createServiceNodeProps({
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
                {...createServiceNodeProps({
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
                {...createServiceNodeProps({
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
          </IconRow>
        </Section>

        <Section>
          <SectionTitle>Databases</SectionTitle>
          <IconRow>
            {databases.map((db) => (
              <div key={db.subtype} style={{ textAlign: 'center' }}>
                <DependencyNode
                  {...createDependencyNodeProps({
                    id: db.subtype,
                    label: db.label,
                    isService: false,
                    spanType: 'db',
                    spanSubtype: db.subtype,
                  })}
                />
                <LabelText>{db.subtype}</LabelText>
              </div>
            ))}
          </IconRow>
        </Section>

        <Section>
          <SectionTitle>Messaging</SectionTitle>
          <IconRow>
            {messaging.map((msg) => (
              <div key={msg.subtype} style={{ textAlign: 'center' }}>
                <DependencyNode
                  {...createDependencyNodeProps({
                    id: msg.subtype,
                    label: msg.label,
                    isService: false,
                    spanType: 'messaging',
                    spanSubtype: msg.subtype,
                  })}
                />
                <LabelText>{msg.subtype}</LabelText>
              </div>
            ))}
          </IconRow>
        </Section>

        <Section>
          <SectionTitle>External</SectionTitle>
          <IconRow>
            {externals.map((ext) => (
              <div key={ext.subtype} style={{ textAlign: 'center' }}>
                <DependencyNode
                  {...createDependencyNodeProps({
                    id: ext.subtype,
                    label: ext.label,
                    isService: false,
                    spanType: ext.spanType,
                    spanSubtype: ext.subtype,
                  })}
                />
                <LabelText>{ext.subtype}</LabelText>
              </div>
            ))}
            <div style={{ textAlign: 'center' }}>
              <DependencyNode
                {...createDependencyNodeProps({
                  id: 'unknown-dependency',
                  label: 'unknown',
                  isService: false,
                  spanType: undefined,
                  spanSubtype: undefined,
                })}
              />
              <LabelText>unknown</LabelText>
            </div>
          </IconRow>
        </Section>

        <Section>
          <SectionTitle>Grouped resources</SectionTitle>
          <IconRow>
            {[
              { spanType: 'db', spanSubtype: 'postgresql', label: 'Databases' },
              { spanType: 'messaging', spanSubtype: 'kafka', label: 'Queues' },
              { spanType: 'external', spanSubtype: 'http', label: 'HTTP APIs' },
              { spanType: 'db', spanSubtype: 'redis', label: 'Caches' },
            ].map((type) => (
              <div key={type.spanSubtype} style={{ textAlign: 'center' }}>
                <GroupedResourcesNode
                  {...createGroupedNodeProps({
                    id: `grouped-${type.spanSubtype}`,
                    label: `3 ${type.label.toLowerCase()}`,
                    isService: false,
                    isGrouped: true,
                    spanType: type.spanType,
                    spanSubtype: type.spanSubtype,
                    count: 3,
                    groupedConnections: Array.from({ length: 3 }, (_, i) => ({
                      id: `${type.spanSubtype}-${i}`,
                      label: `${type.spanSubtype}-${i}`,
                      spanType: type.spanType,
                      spanSubtype: type.spanSubtype,
                    })),
                  })}
                />
                <LabelText>{type.label}</LabelText>
              </div>
            ))}
          </IconRow>
        </Section>
      </>
    );
  },
};
