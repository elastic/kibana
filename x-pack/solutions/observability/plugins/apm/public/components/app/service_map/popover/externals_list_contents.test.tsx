/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { ExternalsListContents } from './externals_list_contents';
import {
  SPAN_DESTINATION_SERVICE_RESOURCE,
  SPAN_TYPE,
  SPAN_SUBTYPE,
} from '../../../../../common/es_fields/apm';

const defaultProps = {
  environment: 'production' as const,
  kuery: '',
  start: '2024-01-01T00:00:00.000Z',
  end: '2024-01-01T01:00:00.000Z',
  onFocusClick: jest.fn(),
};

function groupedNode(data: {
  id: string;
  label?: string;
  groupedConnections: Array<Record<string, unknown>>;
}) {
  return {
    id: data.id,
    type: 'groupedResources' as const,
    position: { x: 0, y: 0 },
    data: {
      id: data.id,
      label: data.label ?? data.id,
      isService: false as const,
      isGrouped: true,
      groupedConnections: data.groupedConnections,
      count: data.groupedConnections.length,
    },
  };
}

describe('ExternalsListContents', () => {
  describe('with ES field names (span.type / span.subtype)', () => {
    it('renders grouped connections with span.type and span.subtype', () => {
      const selection = groupedNode({
        id: 'grouped-node',
        label: 'external (4)',
        groupedConnections: [
          {
            id: 'resource-1',
            label: 'postgres:5432',
            [SPAN_TYPE]: 'db',
            [SPAN_SUBTYPE]: 'postgresql',
          },
          {
            id: 'resource-2',
            label: 'redis:6379',
            [SPAN_TYPE]: 'db',
            [SPAN_SUBTYPE]: 'redis',
          },
        ],
      });

      render(<ExternalsListContents selection={selection} {...defaultProps} />);

      expect(screen.getByText('postgres:5432')).toBeInTheDocument();
      expect(screen.getByText('db (postgresql)')).toBeInTheDocument();
      expect(screen.getByText('redis:6379')).toBeInTheDocument();
      expect(screen.getByText('db (redis)')).toBeInTheDocument();
    });

    it('falls back to SPAN_DESTINATION_SERVICE_RESOURCE when label is missing', () => {
      const selection = groupedNode({
        id: 'grouped-node',
        groupedConnections: [
          {
            id: 'resource-1',
            [SPAN_DESTINATION_SERVICE_RESOURCE]: 'elasticsearch:9200',
            [SPAN_TYPE]: 'db',
            [SPAN_SUBTYPE]: 'elasticsearch',
          },
        ],
      });

      render(<ExternalsListContents selection={selection} {...defaultProps} />);

      expect(screen.getByText('elasticsearch:9200')).toBeInTheDocument();
    });
  });

  describe('with React Flow data format (camelCase property names)', () => {
    it('renders grouped connections with spanType and spanSubtype', () => {
      const selection = groupedNode({
        id: 'grouped-node',
        label: 'external (3)',
        groupedConnections: [
          {
            id: 'resource-1',
            label: 'postgres:5432',
            spanType: 'db',
            spanSubtype: 'postgresql',
          },
          {
            id: 'resource-2',
            label: 'api.example.com',
            spanType: 'external',
            spanSubtype: 'http',
          },
        ],
      });

      render(<ExternalsListContents selection={selection} {...defaultProps} />);

      expect(screen.getByText('postgres:5432')).toBeInTheDocument();
      expect(screen.getByText('db (postgresql)')).toBeInTheDocument();
      expect(screen.getByText('api.example.com')).toBeInTheDocument();
      expect(screen.getByText('external (http)')).toBeInTheDocument();
    });
  });

  describe('handles missing span type/subtype gracefully', () => {
    it('does not render description when spanType and spanSubtype are missing', () => {
      const selection = groupedNode({
        id: 'grouped-node',
        groupedConnections: [
          {
            id: 'resource-1',
            label: 'unknown-resource',
          },
        ],
      });

      render(<ExternalsListContents selection={selection} {...defaultProps} />);

      expect(screen.getByText('unknown-resource')).toBeInTheDocument();
      // Should not render "undefined (undefined)"
      expect(screen.queryByText(/undefined/)).not.toBeInTheDocument();
    });

    it('does not render description when only spanType is present', () => {
      const selection = groupedNode({
        id: 'grouped-node',
        groupedConnections: [
          {
            id: 'resource-1',
            label: 'partial-resource',
            spanType: 'db',
          },
        ],
      });

      render(<ExternalsListContents selection={selection} {...defaultProps} />);

      expect(screen.getByText('partial-resource')).toBeInTheDocument();
      // Should not render incomplete description
      expect(screen.queryByText(/db \(/)).not.toBeInTheDocument();
    });
  });
});
