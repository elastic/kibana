/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { find } from 'lodash/fp';
import { TestProviders } from '../../../../../../common/mock';
import {
  mockAlertDetailsTimelineResponse,
  mockAlertNestedDetailsTimelineResponse,
} from '../../../__mocks__';
import type { HostPanelProps } from '.';
import { HostPanel } from '.';
import { mockBrowserFields } from '../../../../../../common/containers/source/mock';
import { getTimelineEventData } from '../../../utils/get_timeline_event_data';
import { RiskSeverity } from '../../../../../../../common/search_strategy';
import { useRiskScore } from '../../../../../../explore/containers/risk_score';

jest.mock('../../../../../../explore/containers/risk_score');
const mockUseRiskScore = useRiskScore as jest.Mock;

jest.mock('../../../../../containers/detection_engine/alerts/use_host_isolation_status', () => {
  return {
    useHostIsolationStatus: jest.fn().mockReturnValue({
      loading: false,
      isIsolated: false,
      agentStatus: 'healthy',
    }),
  };
});

describe('AlertDetailsPage - SummaryTab - HostPanel', () => {
  const defaultRiskReturnValues = {
    inspect: null,
    refetch: () => {},
    isModuleEnabled: true,
    isLicenseValid: true,
    loading: false,
  };
  const HostPanelWithDefaultProps = (propOverrides: Partial<HostPanelProps>) => (
    <TestProviders>
      <HostPanel
        data={mockAlertDetailsTimelineResponse}
        openHostDetailsPanel={jest.fn}
        id={mockAlertNestedDetailsTimelineResponse._id}
        browserFields={mockBrowserFields}
        selectedPatterns={['random-pattern']}
        {...propOverrides}
      />
    </TestProviders>
  );

  beforeEach(() => {
    mockUseRiskScore.mockReturnValue({ ...defaultRiskReturnValues });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render basic host fields', () => {
    const { getByTestId } = render(<HostPanelWithDefaultProps />);
    const simpleHostFields = ['host.name', 'host.os.name'];

    simpleHostFields.forEach((simpleHostField) => {
      expect(getByTestId('host-panel')).toHaveTextContent(
        getTimelineEventData(simpleHostField, mockAlertDetailsTimelineResponse)
      );
    });
  });

  describe('Agent status', () => {
    it('should show healthy', () => {
      const { getByTestId } = render(<HostPanelWithDefaultProps />);
      expect(getByTestId('host-panel-agent-status')).toHaveTextContent('Healthy');
    });
  });

  describe('host risk', () => {
    it('should not show risk if the license is not valid', () => {
      mockUseRiskScore.mockReturnValue({
        ...defaultRiskReturnValues,
        isLicenseValid: false,
        data: null,
      });
      const { queryByTestId } = render(<HostPanelWithDefaultProps />);
      expect(queryByTestId('host-panel-risk')).toBe(null);
    });

    it('should render risk fields', () => {
      const calculatedScoreNorm = 98.9;
      const calculatedLevel = RiskSeverity.critical;

      mockUseRiskScore.mockReturnValue({
        ...defaultRiskReturnValues,
        isLicenseValid: true,
        data: [
          {
            host: {
              name: mockAlertNestedDetailsTimelineResponse.host?.name,
              risk: {
                calculated_score_norm: calculatedScoreNorm,
                calculated_level: calculatedLevel,
              },
            },
          },
        ],
      });
      const { getByTestId } = render(<HostPanelWithDefaultProps />);

      expect(getByTestId('host-panel-risk')).toHaveTextContent(
        `${Math.round(calculatedScoreNorm)}`
      );
      expect(getByTestId('host-panel-risk')).toHaveTextContent(calculatedLevel);
    });
  });

  describe('host ip', () => {
    it('should render all the ip fields', () => {
      const { getByTestId } = render(<HostPanelWithDefaultProps />);
      const ipFields = find(
        { field: 'host.ip', category: 'host' },
        mockAlertDetailsTimelineResponse
      )?.values as string[];
      expect(getByTestId('host-panel-ip')).toHaveTextContent(ipFields[0]);
      expect(getByTestId('host-panel-ip')).toHaveTextContent('+1 More');
    });
  });
});
