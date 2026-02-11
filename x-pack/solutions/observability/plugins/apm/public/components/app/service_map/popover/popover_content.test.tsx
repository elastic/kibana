/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { MarkerType } from '@xyflow/react';
import { getContentsComponent } from './popover_content';
import type { ServiceMapNode, ServiceMapEdge } from '../../../../../common/service_map';
import { ServiceContents } from './service_contents';
import { DependencyContents } from './dependency_contents';
import { ExternalsListContents } from './externals_list_contents';
import { ResourceContents } from './resource_contents';
import { EdgeContents } from './edge_contents';
import { withDiagnoseButton } from './with_diagnose_button';

jest.mock('./service_contents', () => ({
  ServiceContents: jest.fn(() => <div data-testid="service-contents" />),
}));

jest.mock('./dependency_contents', () => ({
  DependencyContents: jest.fn(() => <div data-testid="dependency-contents" />),
}));

jest.mock('./externals_list_contents', () => ({
  ExternalsListContents: jest.fn(() => <div data-testid="externals-list-contents" />),
}));

jest.mock('./resource_contents', () => ({
  ResourceContents: jest.fn(() => <div data-testid="resource-contents" />),
}));

jest.mock('./edge_contents', () => ({
  EdgeContents: jest.fn(() => <div data-testid="edge-contents" />),
}));

jest.mock('./with_diagnose_button', () => ({
  withDiagnoseButton: jest.fn((Component) => Component),
}));

function node(data: ServiceMapNode['data'], id = data.id): ServiceMapNode {
  return { id, type: 'dependency', position: { x: 0, y: 0 }, data };
}

function edge(id: string, source: string, target: string): ServiceMapEdge {
  return {
    id,
    source,
    target,
    type: 'default',
    data: { isBidirectional: false },
    style: { stroke: '#000', strokeWidth: 1 },
    markerEnd: { type: MarkerType.ArrowClosed, width: 20, height: 20, color: '#000' },
  };
}

describe('getContentsComponent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('service nodes', () => {
    it('returns ServiceContents for service node data', () => {
      const selection = node({
        id: 'test-service',
        label: 'Test Service',
        isService: true,
      });
      const Component = getContentsComponent(selection, false);
      expect(Component).toBe(ServiceContents);
    });

    it('wraps ServiceContents with diagnose button when diagnostic mode is enabled', () => {
      const selection = node({
        id: 'test-service',
        label: 'Test Service',
        isService: true,
      });
      getContentsComponent(selection, true);
      expect(withDiagnoseButton).toHaveBeenCalledWith(ServiceContents);
    });
  });

  describe('dependency nodes', () => {
    it('returns DependencyContents for dependency node with label', () => {
      const selection = node({
        id: 'test-dep',
        label: 'elasticsearch',
        isService: false,
      });
      const Component = getContentsComponent(selection, false);
      expect(Component).toBe(DependencyContents);
    });
  });

  describe('grouped nodes', () => {
    it('returns ExternalsListContents for nodes with groupedConnections', () => {
      const selection = node({
        id: 'grouped',
        label: '3 resources',
        isService: false,
        isGrouped: true,
        groupedConnections: [
          { id: '1', label: 'Resource 1' },
          { id: '2', label: 'Resource 2' },
        ],
        count: 2,
      });
      const Component = getContentsComponent(selection, false);
      expect(Component).toBe(ExternalsListContents);
    });
  });

  describe('resource nodes', () => {
    it('returns ResourceContents for nodes with spanType=resource', () => {
      const selection = node({
        id: 'resource',
        label: 'Resource',
        isService: false,
        spanType: 'resource',
        spanSubtype: 'elasticsearch',
      });
      const Component = getContentsComponent(selection, false);
      expect(Component).toBe(ResourceContents);
    });
  });

  describe('edges', () => {
    it('returns EdgeContents for edge selection', () => {
      const selection = edge('edge-1', 'node-1', 'node-2');
      const Component = getContentsComponent(selection, false);
      expect(Component).toBe(EdgeContents);
    });
  });
});
