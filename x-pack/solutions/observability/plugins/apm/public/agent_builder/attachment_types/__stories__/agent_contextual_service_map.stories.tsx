/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import type { ServiceMapAttachmentData } from '../../../../common/agent_builder/attachments';
import { transformTopologyToServiceMap } from '../../../../common/agent_builder/attachments/service_map_transform';
import { ENVIRONMENT_ALL } from '../../../../common/environment_filter_values';
import { ContextualServiceMapGraph } from '../../../components/app/service_map/contextual_map/contextual_service_map_graph';
import { useContextualServiceMapState } from '../../../components/app/service_map/contextual_map/use_contextual_service_map_state';

/**
 * Stories for the contextual rendering of the Agent Builder
 * `observability.service-map` attachment: `get_service_topology`-shaped
 * `connections`/`nodeMetadata` transformed into the shared
 * `ContextualServiceMapGraph` (focal service, expand/collapse affordances,
 * hops/max-visible controls, popovers).
 *
 * The stories rely on the global `MockApmPluginStorybook` decorator for the
 * contexts the real attachment renderer gets from `ApmEmbeddableContext`.
 */

interface StoryProps {
  data: Pick<ServiceMapAttachmentData, 'connections' | 'nodeMetadata'>;
  serviceName: string;
}

function ContextualAttachmentStory({ data, serviceName }: StoryProps) {
  const { nodes, edges } = useMemo(() => transformTopologyToServiceMap(data), [data]);
  const state = useContextualServiceMapState({ serviceName });

  return (
    <ContextualServiceMapGraph
      height="100%"
      nodes={nodes}
      edges={edges}
      focalServiceId={serviceName}
      baseMaxHops={state.baseMaxHops}
      maxVisibleNodes={state.maxVisibleNodes}
      expandedNodeIds={state.expandedNodeIds}
      onExpand={state.onExpand}
      onCollapse={state.onCollapse}
      onBaseMaxHopsChange={state.onBaseMaxHopsChange}
      onMaxVisibleNodesChange={state.onMaxVisibleNodesChange}
      environment={ENVIRONMENT_ALL.value}
      kuery=""
      start="2024-01-01T00:00:00.000Z"
      end="2024-01-01T00:15:00.000Z"
    />
  );
}

const meta: Meta<typeof ContextualAttachmentStory> = {
  title: 'app/AgentBuilder/AgentContextualServiceMap',
  component: ContextualAttachmentStory,
  decorators: [
    (Story) => (
      <div
        style={{
          width: 700,
          height: 500,
          border: '1px solid var(--euiColorLightShade, #d3dae6)',
          borderRadius: 4,
        }}
      >
        <Story />
      </div>
    ),
  ],
  parameters: {
    layout: 'centered',
    // The contextual graph reads URL params (alerts-tab href factory, popover
    // links); the real renderer gets this route from ApmEmbeddableContext's
    // memory history.
    routePath: '/service-map?rangeFrom=now-15m&rangeTo=now',
  },
};

export default meta;
type Story = StoryObj<typeof ContextualAttachmentStory>;

const service = (name: string, agent: string) => ({
  'service.name': name,
  'agent.name': agent,
});

const external = (resource: string, type: string, subtype?: string) => ({
  'span.destination.service.resource': resource,
  'span.type': type,
  ...(subtype ? { 'span.subtype': subtype } : {}),
});

/** `direction: 'both', depth: 2` shaped topology around `checkout`. */
const depthTwoTopology: ServiceMapAttachmentData['connections'] = [
  // 1 hop
  { source: service('frontend', 'nodejs'), target: service('checkout', 'java') },
  {
    source: service('checkout', 'java'),
    target: service('payment', 'go'),
    metrics: { latencyMs: 120, throughputPerMin: 40, errorRate: 0.03 },
  },
  { source: service('checkout', 'java'), target: service('inventory', 'python') },
  { source: service('checkout', 'java'), target: external('postgres:5432', 'db', 'postgresql') },
  // 2 hops — hidden initially, revealed via expand affordances
  { source: service('api-gateway', 'nodejs'), target: service('frontend', 'nodejs') },
  { source: service('payment', 'go'), target: external('stripe.com:443', 'external', 'http') },
  { source: service('payment', 'go'), target: service('ledger', 'java') },
  { source: service('inventory', 'python'), target: external('redis:6379', 'cache', 'redis') },
  { source: service('inventory', 'python'), target: service('warehouse', 'dotnet') },
];

export const DepthTwoTopology: Story = {
  args: {
    data: { connections: depthTwoTopology },
    serviceName: 'checkout',
  },
};

export const WithAlertAndSloBadges: Story = {
  args: {
    data: {
      connections: depthTwoTopology,
      nodeMetadata: {
        payment: { alertsCount: 3, sloStatus: 'violated', sloCount: 2 },
        inventory: { alertsCount: 1 },
        checkout: { sloStatus: 'degrading', sloCount: 1 },
      },
    },
    serviceName: 'checkout',
  },
};

export const BidirectionalConnections: Story = {
  args: {
    data: {
      connections: [
        ...depthTwoTopology,
        // Reverse edge → collapsed into one bidirectional edge
        { source: service('payment', 'go'), target: service('checkout', 'java') },
      ],
    },
    serviceName: 'checkout',
  },
};
