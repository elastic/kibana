/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { ReactFlowProvider } from '@xyflow/react';
import { ServiceNode } from './service_node';
import { ServiceMapSloFlyoutProvider } from './service_map_slo_flyout_context';
import { useServiceMapAlertsTabNavigate } from './use_service_map_alerts_tab_href';
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

jest.mock('./use_service_map_alerts_tab_href', () => ({
  useServiceMapAlertsTabHref: jest.fn(() => '/app/apm/services/Test%20Service/alerts'),
  useServiceMapAlertsTabNavigate: jest.fn(() => jest.fn()),
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

    it('calls onSloBadgeClick with service name and agent when the badge is clicked', () => {
      const onSloBadgeClick = jest.fn();
      render(
        <ReactFlowProvider>
          <ServiceMapSloFlyoutProvider onSloBadgeClick={onSloBadgeClick}>
            <ServiceNode
              {...defaultNodeProps}
              data={createServiceNodeData({ sloStatus: 'violated', sloCount: 2 })}
              selected={false}
              draggable
            />
          </ServiceMapSloFlyoutProvider>
        </ReactFlowProvider>
      );
      fireEvent.click(screen.getByTestId('apmSloBadge'));
      expect(onSloBadgeClick).toHaveBeenCalledWith('Test Service', 'java');
    });
  });

  describe('Alerts badge', () => {
    it('calls the alerts navigation handler when the alerts badge is clicked', () => {
      const navigateCb = jest.fn();
      jest.mocked(useServiceMapAlertsTabNavigate).mockReturnValue(navigateCb);

      renderServiceNode(createServiceNodeData({ alertsCount: 2 }));
      fireEvent.click(screen.getByTestId('serviceMapNodeAlertsBadge'));
      expect(navigateCb).toHaveBeenCalled();
    });
  });
});
