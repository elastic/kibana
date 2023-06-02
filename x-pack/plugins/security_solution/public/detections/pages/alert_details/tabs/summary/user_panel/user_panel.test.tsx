/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { TestProviders } from '../../../../../../common/mock';
import {
  mockAlertDetailsTimelineResponse,
  mockAlertNestedDetailsTimelineResponse,
} from '../../../__mocks__';
import type { UserPanelProps } from '.';
import { UserPanel } from '.';
import { getTimelineEventData } from '../../../utils/get_timeline_event_data';
import { RiskSeverity } from '../../../../../../../common/search_strategy';
import { useRiskScore } from '../../../../../../explore/containers/risk_score';
import { find } from 'lodash/fp';

jest.mock('../../../../../../explore/containers/risk_score');
const mockUseRiskScore = useRiskScore as jest.Mock;

describe('AlertDetailsPage - SummaryTab - UserPanel', () => {
  const defaultRiskReturnValues = {
    inspect: null,
    refetch: () => {},
    isModuleEnabled: true,
    isLicenseValid: true,
    loading: false,
  };
  const UserPanelWithDefaultProps = (propOverrides: Partial<UserPanelProps>) => (
    <TestProviders>
      <UserPanel
        openUserDetailsPanel={jest.fn}
        data={mockAlertDetailsTimelineResponse}
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

  it('should render basic user fields', () => {
    const { getByTestId } = render(<UserPanelWithDefaultProps />);
    const simpleUserFields = ['user.name'];

    simpleUserFields.forEach((simpleUserField) => {
      expect(getByTestId('user-panel')).toHaveTextContent(
        getTimelineEventData(simpleUserField, mockAlertDetailsTimelineResponse)
      );
    });
  });

  describe('user risk', () => {
    it('should not show risk if the license is not valid', () => {
      mockUseRiskScore.mockReturnValue({
        ...defaultRiskReturnValues,
        isLicenseValid: false,
        data: null,
      });
      const { queryByTestId } = render(<UserPanelWithDefaultProps />);
      expect(queryByTestId('user-panel-risk')).toBe(null);
    });

    it('should render risk fields', () => {
      const calculatedScoreNorm = 98.9;
      const calculatedLevel = RiskSeverity.critical;

      mockUseRiskScore.mockReturnValue({
        ...defaultRiskReturnValues,
        isLicenseValid: true,
        data: [
          {
            user: {
              name: mockAlertNestedDetailsTimelineResponse.user?.name,
              risk: {
                calculated_score_norm: calculatedScoreNorm,
                calculated_level: calculatedLevel,
              },
            },
          },
        ],
      });
      const { getByTestId } = render(<UserPanelWithDefaultProps />);

      expect(getByTestId('user-panel-risk')).toHaveTextContent(
        `${Math.round(calculatedScoreNorm)}`
      );
      expect(getByTestId('user-panel-risk')).toHaveTextContent(calculatedLevel);
    });
  });

  describe('source ip', () => {
    it('should render all the ip fields', () => {
      const { getByTestId } = render(<UserPanelWithDefaultProps />);
      const ipFields = find(
        { field: 'source.ip', category: 'source' },
        mockAlertDetailsTimelineResponse
      )?.values as string[];
      expect(getByTestId('user-panel-ip')).toHaveTextContent(ipFields[0]);
    });
  });
});
