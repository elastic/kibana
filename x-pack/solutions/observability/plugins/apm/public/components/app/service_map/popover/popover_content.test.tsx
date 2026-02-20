/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { getContentsComponent, type ElementData } from './popover_content';
import { SERVICE_NAME, SPAN_TYPE } from '../../../../../common/es_fields/apm';
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

describe('getContentsComponent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('service nodes', () => {
    it('returns ServiceContents for nodes with SERVICE_NAME', () => {
      const elementData: ElementData = {
        id: 'test-service',
        label: 'Test Service',
        [SERVICE_NAME]: 'test-service',
      };

      const Component = getContentsComponent(elementData, false);
      expect(Component).toBe(ServiceContents);
    });

    it('returns ServiceContents for nodes with isService=true (React Flow)', () => {
      const elementData: ElementData = {
        id: 'test-service',
        label: 'Test Service',
        isService: true,
      };

      const Component = getContentsComponent(elementData, false);
      expect(Component).toBe(ServiceContents);
    });

    it('wraps ServiceContents with diagnose button when diagnostic mode is enabled', () => {
      const elementData: ElementData = {
        id: 'test-service',
        label: 'Test Service',
        [SERVICE_NAME]: 'test-service',
      };

      getContentsComponent(elementData, true);
      expect(withDiagnoseButton).toHaveBeenCalledWith(ServiceContents);
    });
  });

  describe('dependency nodes', () => {
    it('returns DependencyContents for nodes with label but no service name', () => {
      const elementData: ElementData = {
        id: 'test-dep',
        label: 'elasticsearch',
      };

      const Component = getContentsComponent(elementData, false);
      expect(Component).toBe(DependencyContents);
    });
  });

  describe('grouped nodes', () => {
    it('returns ExternalsListContents for nodes with groupedConnections array', () => {
      const elementData: ElementData = {
        id: 'grouped',
        label: '3 resources',
        groupedConnections: [
          { id: '1', label: 'Resource 1' },
          { id: '2', label: 'Resource 2' },
        ],
      };

      const Component = getContentsComponent(elementData, false);
      expect(Component).toBe(ExternalsListContents);
    });
  });

  describe('resource nodes', () => {
    it('returns ResourceContents for nodes with SPAN_TYPE=resource (Cytoscape)', () => {
      const elementData: ElementData = {
        id: 'resource',
        label: 'Resource',
        [SPAN_TYPE]: 'resource',
      };

      const Component = getContentsComponent(elementData, false);
      expect(Component).toBe(ResourceContents);
    });

    it('returns ResourceContents for nodes with spanType=resource (React Flow)', () => {
      const elementData: ElementData = {
        id: 'resource',
        label: 'Resource',
        spanType: 'resource',
      };

      const Component = getContentsComponent(elementData, false);
      expect(Component).toBe(ResourceContents);
    });
  });

  describe('edge nodes', () => {
    it('returns EdgeContents for edges with source and target', () => {
      const elementData: ElementData = {
        id: 'edge-1',
        source: 'node-1',
        target: 'node-2',
      };

      const Component = getContentsComponent(elementData, false);
      expect(Component).toBe(EdgeContents);
    });
  });

  describe('unknown nodes', () => {
    it('returns null for nodes without recognizable data', () => {
      const elementData: ElementData = {
        id: 'unknown',
      };

      const Component = getContentsComponent(elementData, false);
      expect(Component).toBeNull();
    });
  });
});
