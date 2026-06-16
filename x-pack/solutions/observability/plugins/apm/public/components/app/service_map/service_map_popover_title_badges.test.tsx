/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { AnomalyDetectorType } from '@kbn/apm-types';
import type { ServiceNodeData } from '../../../../common/service_map';
import { ServiceMapPopoverTitleBadges } from './service_map_popover_title_badges';

const mockNavigateToUrl = jest.fn();

jest.mock('../../../context/apm_plugin/use_apm_plugin_context', () => ({
  useApmPluginContext: () => ({
    core: {
      application: { capabilities: { slo: { read: true } }, navigateToUrl: mockNavigateToUrl },
    },
  }),
}));

jest.mock('../../shared/service_map/service_map_slo_flyout_context', () => ({
  useServiceMapSloFlyout: () => ({ onSloBadgeClick: undefined }),
}));

jest.mock('./use_service_map_alerts_tab_href', () => ({
  useServiceMapAlertsTabNavigate: () => jest.fn(),
}));

jest.mock('../../../hooks/use_apm_router', () => ({
  useApmRouter: () => ({
    link: (path: string) => `/app/apm${path}`,
  }),
}));

jest.mock('../../../hooks/use_apm_params', () => ({
  useAnyOfApmParams: () => ({
    query: {
      rangeFrom: 'now-15m',
      rangeTo: 'now',
      environment: 'ENVIRONMENT_ALL',
      kuery: '',
      comparisonEnabled: false,
      serviceGroup: '',
    },
  }),
}));

jest.mock('../../shared/slo_status_badge', () => ({
  SloStatusBadge: () => <div data-test-subj="apmSloBadge" />,
}));

function serviceNodeData(overrides?: Partial<ServiceNodeData>): ServiceNodeData {
  return {
    id: 'test-service',
    label: 'test-service',
    isService: true,
    ...overrides,
  };
}

describe('ServiceMapPopoverTitleBadges', () => {
  beforeEach(() => {
    mockNavigateToUrl.mockClear();
  });

  it('renders nothing when there are no alerts, SLO issues, or anomalies', () => {
    const { container } = render(<ServiceMapPopoverTitleBadges nodeData={serviceNodeData()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('navigates to the service overview tab via SPA navigation when the anomalies badge is clicked', () => {
    render(
      <ServiceMapPopoverTitleBadges
        nodeData={serviceNodeData({
          serviceAnomalyStats: {
            anomalyScore: 90,
            detectorType: AnomalyDetectorType.txFailureRate,
          },
        })}
      />
    );

    const badge = screen.getByTestId('apmAnomaliesBadge');
    expect(badge).toBeInTheDocument();

    fireEvent.click(badge);
    expect(mockNavigateToUrl).toHaveBeenCalledWith(
      expect.stringContaining('/app/apm/services/{serviceName}/overview')
    );
  });

  it('renders the anomalies badge alongside the alerts badge in the same row', () => {
    render(
      <ServiceMapPopoverTitleBadges
        nodeData={serviceNodeData({
          alertsCount: 2,
          serviceAnomalyStats: { anomalyScore: 90 },
        })}
      />
    );

    expect(screen.getByTestId('serviceMapPopoverAlertsBadge')).toBeInTheDocument();
    expect(screen.getByTestId('apmAnomaliesBadge')).toBeInTheDocument();
  });
});
