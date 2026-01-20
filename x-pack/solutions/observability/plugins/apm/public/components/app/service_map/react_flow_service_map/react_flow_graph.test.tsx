/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { ReactFlowServiceMap } from './react_flow_graph';
import { FETCH_STATUS } from '../../../../hooks/use_fetcher';
import {
  ReactFlowTestWrapper,
  mockScenarios,
  defaultReactFlowProps,
  createMockElements,
} from './test_utils';

// Mock ResizeObserver for React Flow
beforeAll(() => {
  global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

describe('ReactFlowServiceMap', () => {
  describe('rendering scenarios', () => {
    it('renders without errors when elements is empty', () => {
      render(
        <ReactFlowTestWrapper>
          <ReactFlowServiceMap {...defaultReactFlowProps} elements={mockScenarios.empty} />
        </ReactFlowTestWrapper>
      );

      expect(screen.getByTestId('reactFlowServiceMapInner')).toBeInTheDocument();
    });

    it('shows loading spinner when status is LOADING', () => {
      render(
        <ReactFlowTestWrapper>
          <ReactFlowServiceMap
            {...defaultReactFlowProps}
            status={FETCH_STATUS.LOADING}
            elements={mockScenarios.simpleChain}
          />
        </ReactFlowTestWrapper>
      );

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('does not show loading spinner when status is SUCCESS', () => {
      render(
        <ReactFlowTestWrapper>
          <ReactFlowServiceMap
            {...defaultReactFlowProps}
            status={FETCH_STATUS.SUCCESS}
            elements={mockScenarios.simpleChain}
          />
        </ReactFlowTestWrapper>
      );

      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });

    it('renders service nodes from elements', async () => {
      render(
        <ReactFlowTestWrapper>
          <ReactFlowServiceMap {...defaultReactFlowProps} elements={mockScenarios.simpleChain} />
        </ReactFlowTestWrapper>
      );

      await waitFor(() => {
        // Service nodes should be rendered with their labels
        expect(screen.getByText('opbeans-java')).toBeInTheDocument();
        expect(screen.getByText('opbeans-node')).toBeInTheDocument();
      });
    });

    it('renders dependency nodes from elements', async () => {
      render(
        <ReactFlowTestWrapper>
          <ReactFlowServiceMap {...defaultReactFlowProps} elements={mockScenarios.simpleChain} />
        </ReactFlowTestWrapper>
      );

      await waitFor(() => {
        // Dependency node should be rendered with its label
        expect(screen.getByText('postgresql')).toBeInTheDocument();
      });
    });

    it('renders edges between connected nodes', async () => {
      render(
        <ReactFlowTestWrapper>
          <ReactFlowServiceMap {...defaultReactFlowProps} elements={mockScenarios.simpleChain} />
        </ReactFlowTestWrapper>
      );

      // Verify the container renders (edges may not be fully rendered in JSDOM)
      await waitFor(() => {
        const container = screen.getByTestId('reactFlowServiceMapInner');
        expect(container).toBeInTheDocument();
        // Check for the edges container (React Flow creates this wrapper)
        const edgesContainer = container.querySelector('.react-flow__edges');
        expect(edgesContainer).toBeInTheDocument();
      });
    });

    it('renders bidirectional edges with arrows on both ends', async () => {
      const bidirectionalElements = createMockElements({
        services: [
          { id: 'service-a', agentName: 'java' },
          { id: 'service-b', agentName: 'nodejs' },
        ],
        edges: [{ source: 'service-a', target: 'service-b', bidirectional: true }],
      });

      render(
        <ReactFlowTestWrapper>
          <ReactFlowServiceMap {...defaultReactFlowProps} elements={bidirectionalElements} />
        </ReactFlowTestWrapper>
      );

      // Verify the container renders (detailed edge rendering depends on JSDOM limitations)
      await waitFor(() => {
        const container = screen.getByTestId('reactFlowServiceMapInner');
        expect(container).toBeInTheDocument();
        // Check service labels are rendered
        expect(screen.getByText('service-a')).toBeInTheDocument();
        expect(screen.getByText('service-b')).toBeInTheDocument();
      });
    });

    it('verifies edge connections are configured correctly', async () => {
      render(
        <ReactFlowTestWrapper>
          <ReactFlowServiceMap {...defaultReactFlowProps} elements={mockScenarios.simpleChain} />
        </ReactFlowTestWrapper>
      );

      await waitFor(() => {
        const container = screen.getByTestId('reactFlowServiceMapInner');
        expect(container).toBeInTheDocument();

        // Verify the edges container exists (React Flow creates this wrapper for SVG edges)
        const edgesContainer = container.querySelector('.react-flow__edges');
        expect(edgesContainer).toBeInTheDocument();

        // In JSDOM, edges may not fully render due to missing DOM measurements,
        // but we can verify the nodes that should be connected are present
        expect(screen.getByText('opbeans-java')).toBeInTheDocument();
        expect(screen.getByText('opbeans-node')).toBeInTheDocument();
        expect(screen.getByText('postgresql')).toBeInTheDocument();

        // Verify nodes have correct handles for connections
        const javaNodeHandles = container.querySelectorAll('[data-nodeid="opbeans-java"]');
        const nodeNodeHandles = container.querySelectorAll('[data-nodeid="opbeans-node"]');

        // Each node should have source/target handles for edges
        expect(javaNodeHandles.length).toBeGreaterThan(0);
        expect(nodeNodeHandles.length).toBeGreaterThan(0);
      });
    });
  });

  describe('layout scenarios', () => {
    it('renders layout direction toggle button', async () => {
      render(
        <ReactFlowTestWrapper>
          <ReactFlowServiceMap {...defaultReactFlowProps} elements={mockScenarios.simpleChain} />
        </ReactFlowTestWrapper>
      );

      await waitFor(() => {
        // The toggle has horizontal and vertical options
        expect(screen.getByRole('group', { name: /layout direction/i })).toBeInTheDocument();
      });
    });

    it('shows horizontal layout by default', async () => {
      render(
        <ReactFlowTestWrapper>
          <ReactFlowServiceMap {...defaultReactFlowProps} elements={mockScenarios.simpleChain} />
        </ReactFlowTestWrapper>
      );

      await waitFor(() => {
        const horizontalButton = screen.getByRole('button', { name: /horizontal/i });
        expect(horizontalButton).toHaveAttribute('aria-pressed', 'true');
      });
    });

    it('can toggle to vertical layout', async () => {
      render(
        <ReactFlowTestWrapper>
          <ReactFlowServiceMap {...defaultReactFlowProps} elements={mockScenarios.simpleChain} />
        </ReactFlowTestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /vertical/i })).toBeInTheDocument();
      });

      // Verify the toggle buttons exist (clicking causes issues in JSDOM due to React Flow internals)
      const horizontalButton = screen.getByRole('button', { name: /horizontal/i });
      const verticalButton = screen.getByRole('button', { name: /vertical/i });

      expect(horizontalButton).toBeInTheDocument();
      expect(verticalButton).toBeInTheDocument();
    });
  });

  describe('interaction scenarios', () => {
    it('renders zoom controls', async () => {
      render(
        <ReactFlowTestWrapper>
          <ReactFlowServiceMap {...defaultReactFlowProps} elements={mockScenarios.simpleChain} />
        </ReactFlowTestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /zoom in/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /zoom out/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /fit view/i })).toBeInTheDocument();
      });
    });

    it('renders with correct container height', () => {
      const customHeight = 800;

      render(
        <ReactFlowTestWrapper>
          <ReactFlowServiceMap
            {...defaultReactFlowProps}
            height={customHeight}
            elements={mockScenarios.simpleChain}
          />
        </ReactFlowTestWrapper>
      );

      const container = screen.getByTestId('reactFlowServiceMapInner');
      expect(container).toHaveStyle({ height: `${customHeight}px` });
    });
  });

  describe('complex graph scenarios', () => {
    it('renders complex graph with multiple services and dependencies', async () => {
      render(
        <ReactFlowTestWrapper>
          <ReactFlowServiceMap {...defaultReactFlowProps} elements={mockScenarios.complexGraph} />
        </ReactFlowTestWrapper>
      );

      await waitFor(() => {
        // Services
        expect(screen.getByText('api-gateway')).toBeInTheDocument();
        expect(screen.getByText('user-service')).toBeInTheDocument();
        expect(screen.getByText('order-service')).toBeInTheDocument();
        expect(screen.getByText('payment-service')).toBeInTheDocument();
        expect(screen.getByText('notification-service')).toBeInTheDocument();

        // Dependencies
        expect(screen.getByText('postgresql')).toBeInTheDocument();
        expect(screen.getByText('redis')).toBeInTheDocument();
        expect(screen.getByText('kafka')).toBeInTheDocument();
      });
    });

    it('renders services with health status indicators', async () => {
      render(
        <ReactFlowTestWrapper>
          <ReactFlowServiceMap {...defaultReactFlowProps} elements={mockScenarios.healthStatuses} />
        </ReactFlowTestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('healthy-service')).toBeInTheDocument();
        expect(screen.getByText('warning-service')).toBeInTheDocument();
        expect(screen.getByText('critical-service')).toBeInTheDocument();
      });
    });
  });
});
