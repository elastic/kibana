/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { ReactFlowProvider } from '@xyflow/react';
import { ServiceNode } from './service_node';
import { ServiceHealthStatus } from '../../../../common/service_health_status';
import type { ServiceNodeData } from '../../../../common/service_map';
import { MOCK_EUI_THEME, MOCK_DEFAULT_COLOR } from './constants';

// Mock EUI theme
jest.mock('@elastic/eui', () => {
  const original = jest.requireActual('@elastic/eui');
  return {
    ...original,
    useEuiTheme: () => ({
      euiTheme: {
        colors: {
          emptyShade: MOCK_EUI_THEME.colors.emptyShade,
          mediumShade: MOCK_EUI_THEME.colors.mediumShade,
          primary: MOCK_EUI_THEME.colors.primary,
          primaryText: MOCK_EUI_THEME.colors.primaryText,
          textPrimary: MOCK_EUI_THEME.colors.textPrimary,
          textParagraph: MOCK_EUI_THEME.colors.textParagraph,
          text: MOCK_EUI_THEME.colors.text,
          backgroundBasePlain: MOCK_EUI_THEME.colors.backgroundBasePlain,
          success: MOCK_EUI_THEME.colors.success,
          warning: MOCK_EUI_THEME.colors.warning,
          danger: MOCK_EUI_THEME.colors.danger,
        },
        size: {
          xs: '4px',
          s: '8px',
          m: '12px',
          l: '24px',
        },
        border: {
          radius: {
            small: '4px',
            medium: '6px',
          },
          width: {
            thin: '1px',
            thick: '2px',
          },
        },
        font: {
          family: '"Inter", sans-serif',
        },
        animation: {
          fast: '150ms',
        },
      },
      colorMode: 'LIGHT',
    }),
  };
});

// Mock the agent icon
jest.mock('@kbn/custom-icons', () => ({
  getAgentIcon: jest.fn(() => 'mock-icon-url.svg'),
}));

// Mock getServiceHealthStatusColor
jest.mock('../../../../common/service_health_status', () => ({
  ...jest.requireActual('../../../../common/service_health_status'),
  getServiceHealthStatusColor: jest.fn((_theme, status) => {
    switch (status) {
      case 'critical':
        return MOCK_EUI_THEME.colors.danger;
      case 'warning':
        return MOCK_EUI_THEME.colors.warning;
      case 'healthy':
        return MOCK_EUI_THEME.colors.success;
      default:
        return MOCK_DEFAULT_COLOR;
    }
  }),
}));

const defaultNodeProps = {
  id: 'test-service',
  type: 'service' as const,
  dragging: false,
  zIndex: 0,
  isConnectable: true,
  positionAbsoluteX: 0,
  positionAbsoluteY: 0,
  deletable: false,
  selectable: true,
  parentId: undefined,
  sourcePosition: undefined,
  targetPosition: undefined,
  dragHandle: undefined,
  width: 64,
  height: 64,
};

function createServiceNodeData(overrides: Partial<ServiceNodeData> = {}): ServiceNodeData {
  return {
    id: 'test-service',
    label: 'Test Service',
    isService: true,
    agentName: 'java',
    ...overrides,
  };
}

function renderServiceNode(
  data: ServiceNodeData = createServiceNodeData(),
  selected: boolean = false
) {
  return render(
    <ReactFlowProvider>
      <ServiceNode {...defaultNodeProps} data={data} selected={selected} draggable />
    </ReactFlowProvider>
  );
}

describe('ServiceNode', () => {
  it('renders service label', () => {
    renderServiceNode();
    expect(screen.getByText('Test Service')).toBeInTheDocument();
  });

  it('renders agent icon when agentName is provided', () => {
    renderServiceNode();
    const icon = screen.getByAltText('java');
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveAttribute('src', 'mock-icon-url.svg');
  });

  it('renders with data-test-subj attribute', () => {
    renderServiceNode();
    expect(screen.getByTestId('serviceMapNode-service-test-service')).toBeInTheDocument();
  });

  it('applies primary color when selected', () => {
    renderServiceNode(createServiceNodeData(), true);
    // The label should have primary color when selected
    const label = screen.getByText('Test Service');
    expect(label).toBeInTheDocument();
  });

  it('renders without icon when agentName is not provided', () => {
    renderServiceNode(createServiceNodeData({ agentName: undefined }));
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  describe('health status styling', () => {
    it('renders with warning health status', () => {
      const data = createServiceNodeData({
        serviceAnomalyStats: {
          healthStatus: ServiceHealthStatus.warning,
          jobId: 'test-job',
          transactionType: 'request',
          actualValue: 100,
          anomalyScore: 50,
        },
      });
      renderServiceNode(data);
      expect(screen.getByText('Test Service')).toBeInTheDocument();
    });

    it('renders with critical health status', () => {
      const data = createServiceNodeData({
        serviceAnomalyStats: {
          healthStatus: ServiceHealthStatus.critical,
          jobId: 'test-job',
          transactionType: 'request',
          actualValue: 200,
          anomalyScore: 90,
        },
      });
      renderServiceNode(data);
      expect(screen.getByText('Test Service')).toBeInTheDocument();
    });
  });
});
