/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import type { Anomalies } from '../../../../common/components/ml/types';
import { LeftPanelContext } from '../context';
import { TestProviders } from '../../../../common/mock';
import { HostDetails } from './host_details';
import { useMlCapabilities } from '../../../../common/components/ml/hooks/use_ml_capabilities';
import { mockAnomalies } from '../../../../common/components/ml/mock';
import { useHostDetails } from '../../../../explore/hosts/containers/hosts/details';
import { useHostRelatedUsers } from '../../../../common/containers/related_entities/related_users';
import { RiskSeverity } from '../../../../../common/search_strategy';
import {
  HOST_DETAILS_TEST_ID,
  HOST_DETAILS_INFO_TEST_ID,
  HOST_DETAILS_RELATED_USERS_TABLE_TEST_ID,
} from './test_ids';
import { EXPANDABLE_PANEL_CONTENT_TEST_ID } from '../../../shared/components/test_ids';
import { useRiskScore } from '../../../../entity_analytics/api/hooks/use_risk_score';
import { mockContextValue } from '../mocks/mock_context';

jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return { ...actual, useLocation: jest.fn().mockReturnValue({ pathname: '' }) };
});

const mockDispatch = jest.fn();
jest.mock('react-redux', () => {
  const original = jest.requireActual('react-redux');
  return {
    ...original,
    useDispatch: () => mockDispatch,
  };
});

const from = '2022-07-28T08:20:18.966Z';
const to = '2022-07-28T08:20:18.966Z';
jest.mock('../../../../common/containers/use_global_time', () => {
  const actual = jest.requireActual('../../../../common/containers/use_global_time');
  return {
    ...actual,
    useGlobalTime: jest
      .fn()
      .mockReturnValue({ from, to, setQuery: jest.fn(), deleteQuery: jest.fn() }),
  };
});

jest.mock('uuid', () => ({
  v4: jest.fn().mockReturnValue('uuid'),
}));

jest.mock('../../../../common/components/ml/hooks/use_ml_capabilities');
const mockUseMlUserPermissions = useMlCapabilities as jest.Mock;

const mockUseHasSecurityCapability = jest.fn().mockReturnValue(false);
jest.mock('../../../../helper_hooks', () => ({
  useHasSecurityCapability: () => mockUseHasSecurityCapability(),
}));

jest.mock('../../../../common/containers/sourcerer', () => ({
  useSourcererDataView: jest.fn().mockReturnValue({ selectedPatterns: ['index'] }),
}));

jest.mock('../../../../common/components/ml/anomaly/anomaly_table_provider', () => ({
  AnomalyTableProvider: ({
    children,
  }: {
    children: (args: {
      anomaliesData: Anomalies;
      isLoadingAnomaliesData: boolean;
      jobNameById: Record<string, string | undefined>;
    }) => React.ReactNode;
  }) => children({ anomaliesData: mockAnomalies, isLoadingAnomaliesData: false, jobNameById: {} }),
}));

jest.mock('../../../../explore/hosts/containers/hosts/details');
const mockUseHostDetails = useHostDetails as jest.Mock;

jest.mock('../../../../common/containers/related_entities/related_users');
const mockUseHostsRelatedUsers = useHostRelatedUsers as jest.Mock;

jest.mock('../../../../entity_analytics/api/hooks/use_risk_score');
const mockUseRiskScore = useRiskScore as jest.Mock;

const timestamp = '2022-07-25T08:20:18.966Z';

const defaultProps = {
  hostName: 'test host',
  timestamp,
  scopeId: 'scopeId',
};

const mockHostDetailsResponse = [
  false,
  {
    inspect: jest.fn(),
    refetch: jest.fn(),
    hostDetails: { host: { name: ['test host'] } },
  },
];

const mockRiskScoreResponse = {
  data: [
    {
      host: {
        name: 'test host',
        risk: { calculated_level: 'low', calculated_score_norm: 38 },
      },
    },
  ],
  isAuthorized: true,
};

const mockRelatedUsersResponse = {
  inspect: jest.fn(),
  refetch: jest.fn(),
  relatedUsers: [{ user: 'test user', ip: ['100.XXX.XXX'], risk: RiskSeverity.low }],
  loading: false,
};

const renderHostDetails = (contextValue: LeftPanelContext) =>
  render(
    <TestProviders>
      <LeftPanelContext.Provider value={contextValue}>
        <HostDetails {...defaultProps} />
      </LeftPanelContext.Provider>
    </TestProviders>
  );

describe('<HostDetails />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseMlUserPermissions.mockReturnValue({ isPlatinumOrTrialLicense: false, capabilities: {} });
    mockUseHostDetails.mockReturnValue(mockHostDetailsResponse);
    mockUseRiskScore.mockReturnValue(mockRiskScoreResponse);
    mockUseHostsRelatedUsers.mockReturnValue(mockRelatedUsersResponse);
  });

  it('should render host details correctly', () => {
    const { getByTestId } = renderHostDetails(mockContextValue);
    expect(getByTestId(EXPANDABLE_PANEL_CONTENT_TEST_ID(HOST_DETAILS_TEST_ID))).toBeInTheDocument();
  });

  describe('Host overview', () => {
    it('should render the HostOverview with correct dates and indices', () => {
      const { getByTestId } = renderHostDetails(mockContextValue);
      expect(mockUseHostDetails).toBeCalledWith({
        id: 'entities-hosts-details-uuid',
        startDate: from,
        endDate: to,
        hostName: 'test host',
        indexNames: ['index'],
        skip: false,
      });
      expect(getByTestId(HOST_DETAILS_INFO_TEST_ID)).toBeInTheDocument();
    });

    it('should render host risk score when authorized', () => {
      mockUseMlUserPermissions.mockReturnValue({
        isPlatinumOrTrialLicense: true,
        capabilities: {},
      });
      mockUseRiskScore.mockReturnValue({ data: [], isAuthorized: true });

      const { getByText } = renderHostDetails(mockContextValue);
      expect(getByText('Host risk score')).toBeInTheDocument();
    });

    it('should not render host risk score when unauthorized', () => {
      mockUseRiskScore.mockReturnValue({ data: [], isAuthorized: false });
      const { queryByText } = renderHostDetails(mockContextValue);
      expect(queryByText('Host risk score')).not.toBeInTheDocument();
    });
  });

  describe('Related users', () => {
    it('should render the related user table with correct dates and indices', () => {
      const { getByTestId } = renderHostDetails(mockContextValue);
      expect(mockUseHostsRelatedUsers).toBeCalledWith({
        from: timestamp,
        hostName: 'test host',
        indexNames: ['index'],
        skip: false,
      });
      expect(getByTestId(HOST_DETAILS_RELATED_USERS_TABLE_TEST_ID)).toBeInTheDocument();
    });

    it('should render user risk score column when license and capabilities are valid', () => {
      mockUseMlUserPermissions.mockReturnValue({
        isPlatinumOrTrialLicense: true,
        capabilities: {},
      });
      mockUseHasSecurityCapability.mockReturnValue(true);

      const { queryAllByRole } = renderHostDetails(mockContextValue);
      expect(queryAllByRole('columnheader').length).toBe(3);
      expect(queryAllByRole('row')[1].textContent).toContain('test user');
      expect(queryAllByRole('row')[1].textContent).toContain('100.XXX.XXX');
      expect(queryAllByRole('row')[1].textContent).toContain('Low');
    });

    it('should not render host risk score column when user has no entity-risk capability', () => {
      mockUseMlUserPermissions.mockReturnValue({
        isPlatinumOrTrialLicense: true,
        capabilities: {},
      });
      mockUseHasSecurityCapability.mockReturnValue(false);

      const { queryAllByRole } = renderHostDetails(mockContextValue);
      expect(queryAllByRole('columnheader').length).toBe(2);
    });

    it('should not render host risk score column when license is not valid', () => {
      const { queryAllByRole } = renderHostDetails(mockContextValue);
      expect(queryAllByRole('columnheader').length).toBe(2);
    });

    it('should render empty table if no related user is returned', () => {
      mockUseHostsRelatedUsers.mockReturnValue({
        ...mockRelatedUsersResponse,
        relatedUsers: [],
        loading: false,
      });

      const { getByTestId } = renderHostDetails(mockContextValue);
      expect(getByTestId(HOST_DETAILS_RELATED_USERS_TABLE_TEST_ID).textContent).toContain(
        'No users identified'
      );
    });
  });
});
