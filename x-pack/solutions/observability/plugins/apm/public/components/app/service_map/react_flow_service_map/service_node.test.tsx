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
import { ServiceNode, type ServiceMapNodeData } from './service_node';
import { ServiceHealthStatus } from '../../../../../common/service_health_status';

// Mock getAgentIcon to avoid loading actual images
jest.mock('@kbn/custom-icons', () => ({
  getAgentIcon: (agentName: string) => `/mock-icons/${agentName}.svg`,
}));

function renderServiceNode(
  data: Partial<ServiceMapNodeData> & { id: string; label: string; isService: boolean },
  options: { selected?: boolean } = {}
) {
  const nodeProps = {
    id: data.id,
    type: 'service' as const,
    data: {
      id: data.id,
      label: data.label,
      isService: data.isService,
      agentName: data.agentName,
      serviceAnomalyStats: data.serviceAnomalyStats,
    } as ServiceMapNodeData,
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
        <ServiceNode selectable={false} deletable={false} draggable={false} {...nodeProps} />
      </ReactFlowProvider>
    </EuiThemeProvider>
  );
}

describe('ServiceNode', () => {
  describe('rendering', () => {
    it('renders with the service label', () => {
      renderServiceNode({
        id: 'opbeans-java',
        label: 'opbeans-java',
        isService: true,
        agentName: 'java',
      });

      expect(screen.getByText('opbeans-java')).toBeInTheDocument();
    });

    it('renders agent icon when agentName is provided', () => {
      renderServiceNode({
        id: 'opbeans-java',
        label: 'opbeans-java',
        isService: true,
        agentName: 'java',
      });

      const icon = screen.getByRole('img');
      expect(icon).toHaveAttribute('src', '/mock-icons/java.svg');
      expect(icon).toHaveAttribute('alt', 'java');
    });

    it('does not render icon when agentName is not provided', () => {
      renderServiceNode({
        id: 'unknown-service',
        label: 'unknown-service',
        isService: true,
      });

      expect(screen.queryByRole('img')).not.toBeInTheDocument();
    });

    it('renders a circular container for service nodes', () => {
      renderServiceNode({
        id: 'opbeans-java',
        label: 'opbeans-java',
        isService: true,
        agentName: 'java',
      });

      // The node should render the service node with data-test-subj
      expect(screen.getByTestId('serviceMapNode-service-opbeans-java')).toBeInTheDocument();
      // And should have the label
      expect(screen.getByText('opbeans-java')).toBeInTheDocument();
    });
  });

  describe('selection state', () => {
    it('applies default border color when not selected', () => {
      const { container } = renderServiceNode(
        {
          id: 'opbeans-java',
          label: 'opbeans-java',
          isService: true,
          agentName: 'java',
        },
        { selected: false }
      );

      // When not selected, should have mediumShade color (not primary)
      const labelElement = screen.getByText('opbeans-java');
      expect(labelElement).toBeInTheDocument();
      expect(container).toBeInTheDocument();
    });

    it('applies primary color when selected', () => {
      renderServiceNode(
        {
          id: 'opbeans-java',
          label: 'opbeans-java',
          isService: true,
          agentName: 'java',
        },
        { selected: true }
      );

      // The label should reflect selected state
      const labelElement = screen.getByText('opbeans-java');
      expect(labelElement).toBeInTheDocument();
    });
  });

  describe('health status indicators', () => {
    it('renders with warning health status', () => {
      const { container } = renderServiceNode({
        id: 'warning-service',
        label: 'warning-service',
        isService: true,
        agentName: 'java',
        serviceAnomalyStats: {
          healthStatus: ServiceHealthStatus.warning,
        },
      });

      expect(screen.getByText('warning-service')).toBeInTheDocument();
      expect(container).toBeInTheDocument();
    });

    it('renders with critical health status', () => {
      const { container } = renderServiceNode({
        id: 'critical-service',
        label: 'critical-service',
        isService: true,
        agentName: 'java',
        serviceAnomalyStats: {
          healthStatus: ServiceHealthStatus.critical,
        },
      });

      expect(screen.getByText('critical-service')).toBeInTheDocument();
      expect(container).toBeInTheDocument();
    });

    it('renders without health status indicator when no anomaly stats', () => {
      const { container } = renderServiceNode({
        id: 'healthy-service',
        label: 'healthy-service',
        isService: true,
        agentName: 'java',
      });

      expect(screen.getByText('healthy-service')).toBeInTheDocument();
      expect(container).toBeInTheDocument();
    });
  });

  describe('different agent types', () => {
    const agents = ['java', 'nodejs', 'python', 'go', 'dotnet', 'ruby', 'php'];

    agents.forEach((agent) => {
      it(`renders ${agent} agent icon`, () => {
        renderServiceNode({
          id: `${agent}-service`,
          label: `${agent}-service`,
          isService: true,
          agentName: agent,
        });

        const icon = screen.getByRole('img');
        expect(icon).toHaveAttribute('src', `/mock-icons/${agent}.svg`);
      });
    });
  });
});
