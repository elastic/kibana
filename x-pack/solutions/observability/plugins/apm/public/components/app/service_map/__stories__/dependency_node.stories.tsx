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
import { DependencyNode } from '../dependency_node';
import type { DependencyNodeData } from '../../../../../common/service_map';

const LabelText = ({ children }: { children: React.ReactNode }) => {
  const { euiTheme } = useEuiTheme();
  return (
    <div style={{ marginTop: 8, fontSize: 12, color: euiTheme.colors.textSubdued }}>{children}</div>
  );
};

const meta: Meta<typeof DependencyNode> = {
  title: 'app/ServiceMap/DependencyNode',
  component: DependencyNode,
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
type Story = StoryObj<typeof DependencyNode>;

const createNodeProps = (data: DependencyNodeData, selected = false) => ({
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

export const Selected: Story = {
  args: createNodeProps(
    {
      id: 'selected-dependency',
      label: 'selected-dependency',
      isService: false,
      spanType: 'db',
      spanSubtype: 'postgresql',
    },
    true
  ),
};

export const LongLabel: Story = {
  args: createNodeProps({
    id: 'very-long-dependency-name-that-should-truncate',
    label: 'very-long-dependency-name-that-should-truncate',
    isService: false,
    spanType: 'external',
    spanSubtype: 'http',
  }),
};

export const UnknownType: Story = {
  args: createNodeProps({
    id: 'unknown-dependency',
    label: 'unknown-dependency',
    isService: false,
    spanType: undefined,
    spanSubtype: undefined,
  }),
};

export const AllDatabaseTypes: StoryObj = {
  render: () => {
    const databases = [
      { subtype: 'elasticsearch', label: 'elasticsearch' },
      { subtype: 'postgresql', label: 'postgresql' },
      { subtype: 'mysql', label: 'mysql' },
      { subtype: 'mongodb', label: 'mongodb' },
      { subtype: 'redis', label: 'redis' },
      { subtype: 'cassandra', label: 'cassandra' },
    ];
    return (
      <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
        {databases.map((db) => (
          <div key={db.subtype} style={{ textAlign: 'center' }}>
            <DependencyNode
              {...createNodeProps({
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
      </div>
    );
  },
};

export const AllMessagingTypes: StoryObj = {
  render: () => {
    const messaging = [
      { subtype: 'kafka', label: 'kafka' },
      { subtype: 'rabbitmq', label: 'rabbitmq' },
      { subtype: 'sns', label: 'sns' },
      { subtype: 'sqs', label: 'sqs' },
    ];
    return (
      <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
        {messaging.map((msg) => (
          <div key={msg.subtype} style={{ textAlign: 'center' }}>
            <DependencyNode
              {...createNodeProps({
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
      </div>
    );
  },
};

export const AllExternalTypes: StoryObj = {
  render: () => {
    const externals = [
      { subtype: 'http', label: 'api.example.com', spanType: 'external' },
      { subtype: 'grpc', label: 'grpc-service', spanType: 'external' },
      { subtype: 'graphql', label: 'graphql-api', spanType: 'external' },
    ];
    return (
      <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
        {externals.map((ext) => (
          <div key={ext.subtype} style={{ textAlign: 'center' }}>
            <DependencyNode
              {...createNodeProps({
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
      </div>
    );
  },
};
