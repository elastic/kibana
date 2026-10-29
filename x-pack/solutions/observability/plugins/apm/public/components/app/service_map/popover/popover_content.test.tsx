/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { getContentsComponent, PopoverContent } from './popover_content';
import type { ServiceMapNode } from '../../../../../common/service_map';
import { DependencyContents } from './dependency_contents';
import { ExternalsListContents } from './externals_list_contents';
import { ResourceContents } from './resource_contents';

jest.mock('../../../../context/apm_plugin/use_apm_plugin_context', () => ({
  useApmPluginContext: () => ({
    core: {
      uiSettings: { get: jest.fn().mockReturnValue(false) },
    },
  }),
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

function node(data: ServiceMapNode['data'], id = data.id): ServiceMapNode {
  return { id, type: 'dependency', position: { x: 0, y: 0 }, data };
}

describe('getContentsComponent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
});

describe('Popover title (display names without ">" for dependencies)', () => {
  const defaultProps = {
    environment: 'production' as const,
    kuery: '',
    start: '2024-01-01T00:00:00.000Z',
    end: '2024-01-01T01:00:00.000Z',
    onFocusClick: jest.fn(),
  };

  it('shows data.label for dependency node (id may be ">postgresql")', () => {
    const selectedNode: ServiceMapNode = {
      id: '>postgresql',
      type: 'dependency',
      position: { x: 0, y: 0 },
      data: {
        id: '>postgresql',
        label: 'postgresql',
        isService: false,
      },
    };

    render(<PopoverContent selectedNode={selectedNode} {...defaultProps} />);

    expect(screen.getByTestId('serviceMapPopoverTitle')).toHaveTextContent('postgresql');
  });
});
