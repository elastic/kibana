/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { MarkerType } from '@xyflow/react';
import { SPAN_DESTINATION_SERVICE_RESOURCE, SPAN_TYPE, SPAN_SUBTYPE } from '@kbn/apm-types';
import { MockApmPluginStorybook } from '../../../../context/apm_plugin/mock_apm_plugin_storybook';
import { PopoverContent } from './popover_content';
import type { ServiceMapNode, ServiceMapEdge } from '../../../../../common/service_map';

const routePath = '/service-map?rangeFrom=now-15m&rangeTo=now';
const noop = () => {};

const decorators: Meta['decorators'] = [
  (Story) => (
    <MockApmPluginStorybook routePath={routePath}>
      <Story />
    </MockApmPluginStorybook>
  ),
];

const meta: Meta<typeof PopoverContent> = {
  title: 'app/ServiceMap/Popover',
  component: PopoverContent,
  decorators,
};

export default meta;

type Story = StoryObj<typeof PopoverContent>;

const dependencyNode: ServiceMapNode = {
  id: 'postgres',
  type: 'dependency',
  position: { x: 0, y: 0 },
  data: { id: 'postgres', label: 'postgres', isService: false },
};

export const Dependency: Story = {
  render: () => (
    <PopoverContent
      selectedNode={dependencyNode}
      selectedEdge={null}
      environment="ENVIRONMENT_ALL"
      kuery=""
      start="now-15m"
      end="now"
      onFocusClick={noop}
    />
  ),
};

const externalsListNode: ServiceMapNode = {
  id: 'externals-group',
  type: 'groupedResources',
  position: { x: 0, y: 0 },
  data: {
    id: 'externals-group',
    label: 'External resources',
    isService: false,
    isGrouped: true,
    groupedConnections: [
      {
        id: 'ext-1',
        label: '813-mam-392.mktoresp.com:443',
        spanType: 'external',
        spanSubtype: 'http',
      },
    ],
    count: 1,
  },
};

export const ExternalsList: Story = {
  render: () => (
    <PopoverContent
      selectedNode={externalsListNode}
      selectedEdge={null}
      environment="ENVIRONMENT_ALL"
      kuery=""
      start="now-15m"
      end="now"
      onFocusClick={noop}
    />
  ),
};

const resourceNode: ServiceMapNode = {
  id: 'resource-id',
  type: 'dependency',
  position: { x: 0, y: 0 },
  data: {
    id: 'resource-id',
    label: 'Resource',
    isService: false,
    spanType: 'resource',
    spanSubtype: 'elasticsearch',
  },
};

export const Resource: Story = {
  render: () => (
    <PopoverContent
      selectedNode={resourceNode}
      selectedEdge={null}
      environment="ENVIRONMENT_ALL"
      kuery=""
      start="now-15m"
      end="now"
      onFocusClick={noop}
    />
  ),
};

const serviceNode: ServiceMapNode = {
  id: 'opbeans-node',
  type: 'service',
  position: { x: 0, y: 0 },
  data: {
    id: 'opbeans-node',
    label: 'opbeans-node',
    isService: true,
  },
};

export const Service: Story = {
  render: () => (
    <PopoverContent
      selectedNode={serviceNode}
      selectedEdge={null}
      environment="ENVIRONMENT_ALL"
      kuery=""
      start="now-15m"
      end="now"
      onFocusClick={noop}
    />
  ),
};

const edgeSelection: ServiceMapEdge = {
  id: 'e1',
  source: 'svc-a',
  target: 'svc-b',
  type: 'default',
  data: {
    isBidirectional: false,
    sourceData: {
      id: 'svc-a',
      [SPAN_DESTINATION_SERVICE_RESOURCE]: 'svc-a',
      [SPAN_TYPE]: 'external',
      [SPAN_SUBTYPE]: 'http',
      label: 'svc-a',
    },
    targetData: {
      id: 'svc-b',
      [SPAN_DESTINATION_SERVICE_RESOURCE]: 'svc-b',
      [SPAN_TYPE]: 'external',
      [SPAN_SUBTYPE]: 'http',
      label: 'svc-b',
    },
    resources: ['svc-b'],
  },
  style: { stroke: '#000', strokeWidth: 1 },
  markerEnd: { type: MarkerType.ArrowClosed, width: 20, height: 20, color: '#000' },
};

export const Edge: Story = {
  render: () => (
    <PopoverContent
      selectedNode={null}
      selectedEdge={edgeSelection}
      environment="ENVIRONMENT_ALL"
      kuery=""
      start="now-15m"
      end="now"
      onFocusClick={noop}
    />
  ),
};
