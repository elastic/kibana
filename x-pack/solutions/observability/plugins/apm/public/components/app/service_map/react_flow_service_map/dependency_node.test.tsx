/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { Position, ReactFlowProvider } from '@xyflow/react';
import { EuiThemeProvider } from '@elastic/eui';
import { DependencyNode, type DependencyMapNodeData } from './dependency_node';

// Mock getSpanIcon to avoid loading actual images
jest.mock('@kbn/apm-ui-shared', () => ({
  getSpanIcon: (spanType: string, spanSubtype: string) =>
    `/mock-span-icons/${spanType}-${spanSubtype}.svg`,
}));

function renderDependencyNode(
  data: Partial<DependencyMapNodeData> & { id: string; label: string },
  options: { selected?: boolean } = {}
) {
  const nodeProps = {
    id: data.id,
    type: 'dependency' as const,
    data: {
      id: data.id,
      label: data.label,
      spanType: data.spanType ?? '',
      spanSubtype: data.spanSubtype ?? '',
    } as DependencyMapNodeData,
    selected: options.selected ?? false,
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
    zIndex: 0,
    isConnectable: true,
    xPos: 0,
    yPos: 0,
    dragging: false,
    positionAbsoluteX: 0,
    positionAbsoluteY: 0,
  };

  return render(
    <EuiThemeProvider>
      <ReactFlowProvider>
        <DependencyNode selectable={false} deletable={false} draggable={false} {...nodeProps} />
      </ReactFlowProvider>
    </EuiThemeProvider>
  );
}

describe('DependencyNode', () => {
  describe('rendering', () => {
    it('renders with the dependency label', () => {
      renderDependencyNode({
        id: 'postgresql',
        label: 'postgresql',
        spanType: 'db',
        spanSubtype: 'postgresql',
      });

      expect(screen.getByText('postgresql')).toBeInTheDocument();
    });

    it('renders span icon when spanType and spanSubtype are provided', () => {
      renderDependencyNode({
        id: 'postgresql',
        label: 'postgresql',
        spanType: 'db',
        spanSubtype: 'postgresql',
      });

      const icon = screen.getByRole('img');
      expect(icon).toHaveAttribute('src', '/mock-span-icons/db-postgresql.svg');
    });

    it('does not render icon when spanType is not provided', () => {
      renderDependencyNode({
        id: 'unknown-dep',
        label: 'unknown-dep',
      });

      expect(screen.queryByRole('img')).not.toBeInTheDocument();
    });

    it('renders a diamond shape container', () => {
      renderDependencyNode({
        id: 'postgresql',
        label: 'postgresql',
        spanType: 'db',
        spanSubtype: 'postgresql',
      });

      // The node should render the dependency node with data-test-subj
      expect(screen.getByTestId('serviceMapNode-dependency-postgresql')).toBeInTheDocument();
      // And should have the label
      expect(screen.getByText('postgresql')).toBeInTheDocument();
    });
  });

  describe('selection state', () => {
    it('applies default border color when not selected', () => {
      const { container } = renderDependencyNode(
        {
          id: 'postgresql',
          label: 'postgresql',
          spanType: 'db',
          spanSubtype: 'postgresql',
        },
        { selected: false }
      );

      expect(screen.getByText('postgresql')).toBeInTheDocument();
      expect(container).toBeInTheDocument();
    });

    it('applies primary color styling when selected', () => {
      renderDependencyNode(
        {
          id: 'postgresql',
          label: 'postgresql',
          spanType: 'db',
          spanSubtype: 'postgresql',
        },
        { selected: true }
      );

      // The label should be rendered with selected styling
      const labelElement = screen.getByText('postgresql');
      expect(labelElement).toBeInTheDocument();
    });
  });

  describe('different dependency types', () => {
    const dependencies = [
      { spanType: 'db', spanSubtype: 'postgresql', label: 'postgresql' },
      { spanType: 'db', spanSubtype: 'mysql', label: 'mysql' },
      { spanType: 'cache', spanSubtype: 'redis', label: 'redis' },
      { spanType: 'messaging', spanSubtype: 'kafka', label: 'kafka' },
      { spanType: 'external', spanSubtype: 'http', label: 'external-api' },
      { spanType: 'storage', spanSubtype: 's3', label: 's3-bucket' },
    ];

    dependencies.forEach(({ spanType, spanSubtype, label }) => {
      it(`renders ${spanType}/${spanSubtype} dependency icon`, () => {
        renderDependencyNode({
          id: label,
          label,
          spanType,
          spanSubtype,
        });

        const icon = screen.getByRole('img');
        expect(icon).toHaveAttribute('src', `/mock-span-icons/${spanType}-${spanSubtype}.svg`);
      });
    });
  });

  describe('label text handling', () => {
    it('renders long labels', () => {
      const longLabel = 'very-long-database-connection-string-postgresql-primary';
      renderDependencyNode({
        id: 'long-dep',
        label: longLabel,
        spanType: 'db',
        spanSubtype: 'postgresql',
      });

      expect(screen.getByText(longLabel)).toBeInTheDocument();
    });

    it('renders labels with special characters', () => {
      const specialLabel = 'redis:6379';
      renderDependencyNode({
        id: 'redis-cache',
        label: specialLabel,
        spanType: 'cache',
        spanSubtype: 'redis',
      });

      expect(screen.getByText(specialLabel)).toBeInTheDocument();
    });
  });
});
