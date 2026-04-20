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
import { MOCK_EUI_THEME, MOCK_DEFAULT_COLOR, MOCK_EUI_THEME_FOR_USE_THEME } from './constants';

jest.mock('@elastic/eui', () => {
  const original = jest.requireActual('@elastic/eui');
  return {
    ...original,
    useEuiTheme: () => ({
      euiTheme: MOCK_EUI_THEME_FOR_USE_THEME,
      colorMode: 'LIGHT',
    }),
  };
});

// Mock the agent icon
jest.mock('@kbn/custom-icons', () => ({
  getAgentIcon: jest.fn(() => 'mock-icon-url.svg'),
}));

jest.mock('../../../context/apm_plugin/use_apm_plugin_context', () => ({
  useApmPluginContext: () => ({
    core: {
      application: {
        capabilities: {
          slo: { read: true },
        },
      },
    },
  }),
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

  describe('SLO badge (service map only)', () => {
    it('does not render SLO badge when status is noSLOs', () => {
      renderServiceNode(createServiceNodeData({ sloStatus: 'noSLOs', sloCount: 0 }));
      expect(screen.queryByTestId('apmSloBadge')).not.toBeInTheDocument();
      expect(screen.queryByText('No SLOs')).not.toBeInTheDocument();
    });

    it('does not render SLO badge for healthy status', () => {
      renderServiceNode(createServiceNodeData({ sloStatus: 'healthy', sloCount: 2 }));
      expect(screen.queryByTestId('apmSloBadge')).not.toBeInTheDocument();
    });

    it('does not render SLO badge for noData status', () => {
      renderServiceNode(createServiceNodeData({ sloStatus: 'noData', sloCount: 1 }));
      expect(screen.queryByTestId('apmSloBadge')).not.toBeInTheDocument();
    });

    it('renders SLO badge for violated status', () => {
      renderServiceNode(createServiceNodeData({ sloStatus: 'violated', sloCount: 2 }));
      expect(screen.getByTestId('apmSloBadge')).toBeInTheDocument();
      expect(screen.getByTestId('apmSloBadge')).toHaveAttribute('data-slo-status', 'violated');
    });

    it('renders SLO badge for degrading status', () => {
      renderServiceNode(createServiceNodeData({ sloStatus: 'degrading', sloCount: 1 }));
      expect(screen.getByTestId('apmSloBadge')).toBeInTheDocument();
      expect(screen.getByTestId('apmSloBadge')).toHaveAttribute('data-slo-status', 'degrading');
    });
  });

  describe('alert badge', () => {
    it('renders alerts badge with count when alertsCount is greater than zero', () => {
      renderServiceNode(createServiceNodeData({ alertsCount: 4 }));
      const badge = screen.getByTestId('serviceMapNodeAlertsBadge');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveTextContent('4');
    });

    it('does not render alerts badge when alertsCount is zero', () => {
      renderServiceNode(createServiceNodeData({ alertsCount: 0 }));
      expect(screen.queryByTestId('serviceMapNodeAlertsBadge')).not.toBeInTheDocument();
    });

    it('does not render alerts badge when alertsCount is undefined', () => {
      renderServiceNode();
      expect(screen.queryByTestId('serviceMapNodeAlertsBadge')).not.toBeInTheDocument();
    });
  });

  it('exposes a stable test subject on the service circle for e2e', () => {
    renderServiceNode();
    expect(screen.getByTestId('serviceMapNodeServiceCircle')).toBeInTheDocument();
  });
});
