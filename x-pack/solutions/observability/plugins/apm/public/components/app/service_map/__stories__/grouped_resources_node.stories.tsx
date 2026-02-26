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
import { MockApmPluginStorybook } from '../../../../context/apm_plugin/mock_apm_plugin_storybook';
import { GroupedResourcesNode } from '../grouped_resources_node';
import type { GroupedNodeData } from '../../../../../common/service_map';

const LabelText = ({ children }: { children: React.ReactNode }) => {
  const { euiTheme } = useEuiTheme();
  return (
    <div style={{ marginTop: 8, fontSize: 12, color: euiTheme.colors.textSubdued }}>{children}</div>
  );
};

const meta: Meta<typeof GroupedResourcesNode> = {
  title: 'app/ServiceMap/GroupedResourcesNode',
  component: GroupedResourcesNode,
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
type Story = StoryObj<typeof GroupedResourcesNode>;

const createNodeProps = (data: GroupedNodeData, selected = false) => ({
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

export const Selected: Story = {
  args: createNodeProps(
    {
      id: 'grouped-selected',
      label: '3 databases',
      isService: false,
      isGrouped: true,
      spanType: 'db',
      spanSubtype: 'redis',
      count: 3,
      groupedConnections: [
        { id: 'cache1', label: 'cache-1', spanType: 'db', spanSubtype: 'redis' },
        { id: 'cache2', label: 'cache-2', spanType: 'db', spanSubtype: 'redis' },
        { id: 'cache3', label: 'cache-3', spanType: 'db', spanSubtype: 'redis' },
      ],
    },
    true
  ),
};

export const VariousGroupSizes: StoryObj = {
  render: () => {
    const sizes = [2, 5, 10, 25, 50, 99];
    return (
      <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
        {sizes.map((count) => (
          <div key={count} style={{ textAlign: 'center' }}>
            <GroupedResourcesNode
              {...createNodeProps({
                id: `grouped-${count}`,
                label: `${count} resources`,
                isService: false,
                isGrouped: true,
                spanType: 'db',
                spanSubtype: 'postgresql',
                count,
                groupedConnections: Array.from({ length: count }, (_, i) => ({
                  id: `res-${i}`,
                  label: `resource-${i}`,
                  spanType: 'db',
                  spanSubtype: 'postgresql',
                })),
              })}
            />
            <LabelText>{count} items</LabelText>
          </div>
        ))}
      </div>
    );
  },
};

export const DifferentResourceTypes: StoryObj = {
  render: () => {
    const types = [
      { spanType: 'db', spanSubtype: 'postgresql', label: 'Databases' },
      { spanType: 'messaging', spanSubtype: 'kafka', label: 'Queues' },
      { spanType: 'external', spanSubtype: 'http', label: 'HTTP APIs' },
      { spanType: 'db', spanSubtype: 'redis', label: 'Caches' },
    ];
    return (
      <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
        {types.map((type) => (
          <div key={type.spanSubtype} style={{ textAlign: 'center' }}>
            <GroupedResourcesNode
              {...createNodeProps({
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
      </div>
    );
  },
};
