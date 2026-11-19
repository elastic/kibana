/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { PopoverContent } from './popover_content';
import type { ServiceMapNode } from '../../../../../common/service_map';

const noop = () => {};

const meta: Meta<typeof PopoverContent> = {
  title: 'app/ServiceMap/Popover',
  component: PopoverContent,
  parameters: {
    routePath: '/service-map?rangeFrom=now-15m&rangeTo=now',
  },
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
      environment="ENVIRONMENT_ALL"
      kuery=""
      start="now-15m"
      end="now"
      onFocusClick={noop}
    />
  ),
};

const serviceNodeWithAlerts: ServiceMapNode = {
  id: 'alerting-service',
  type: 'service',
  position: { x: 0, y: 0 },
  data: {
    id: 'alerting-service',
    label: 'alerting-service',
    isService: true,
    agentName: 'java',
    alertsCount: 3,
  },
};

export const ServiceWithAlerts: Story = {
  render: () => (
    <PopoverContent
      selectedNode={serviceNodeWithAlerts}
      environment="ENVIRONMENT_ALL"
      kuery=""
      start="now-15m"
      end="now"
      onFocusClick={noop}
    />
  ),
};

const serviceNodeWithSlo: ServiceMapNode = {
  id: 'slo-service',
  type: 'service',
  position: { x: 0, y: 0 },
  data: {
    id: 'slo-service',
    label: 'slo-service',
    isService: true,
    agentName: 'nodejs',
    sloStatus: 'violated',
    sloCount: 2,
  },
};

export const ServiceWithSlo: Story = {
  render: () => (
    <PopoverContent
      selectedNode={serviceNodeWithSlo}
      environment="ENVIRONMENT_ALL"
      kuery=""
      start="now-15m"
      end="now"
      onFocusClick={noop}
    />
  ),
};

const serviceNodeWithAllBadges: ServiceMapNode = {
  id: 'full-badges-service',
  type: 'service',
  position: { x: 0, y: 0 },
  data: {
    id: 'full-badges-service',
    label: 'full-badges-service',
    isService: true,
    agentName: 'python',
    alertsCount: 5,
    sloStatus: 'degrading',
    sloCount: 3,
  },
};

export const ServiceWithAllBadges: Story = {
  render: () => (
    <PopoverContent
      selectedNode={serviceNodeWithAllBadges}
      environment="ENVIRONMENT_ALL"
      kuery=""
      start="now-15m"
      end="now"
      onFocusClick={noop}
    />
  ),
};
