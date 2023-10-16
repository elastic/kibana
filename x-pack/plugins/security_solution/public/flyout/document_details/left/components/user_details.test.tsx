/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import type { Anomalies } from '../../../../common/components/ml/types';
import { TestProviders } from '../../../../common/mock';
import { UserDetails } from './user_details';
import { useMlCapabilities } from '../../../../common/components/ml/hooks/use_ml_capabilities';
import { useRiskScore } from '../../../../explore/containers/risk_score';
import { mockAnomalies } from '../../../../common/components/ml/mock';
import { useObservedUserDetails } from '../../../../explore/users/containers/users/observed_details';
import { useUserRelatedHosts } from '../../../../common/containers/related_entities/related_hosts';
import { RiskSeverity } from '../../../../../common/search_strategy';
import {
  USER_DETAILS_TEST_ID,
  USER_DETAILS_INFO_TEST_ID,
  USER_DETAILS_RELATED_HOSTS_TABLE_TEST_ID,
} from './test_ids';
import { EXPANDABLE_PANEL_CONTENT_TEST_ID } from '../../../shared/components/test_ids';

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

const from = '2022-07-20T08:20:18.966Z';
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

jest.mock('../../../../helper_hooks', () => ({ useHasSecurityCapability: () => true }));

jest.mock('../../../../explore/users/containers/users/observed_details');
const mockUseObservedUserDetails = useObservedUserDetails as jest.Mock;

jest.mock('../../../../common/containers/related_entities/related_hosts');
const mockUseUsersRelatedHosts = useUserRelatedHosts as jest.Mock;

jest.mock('../../../../explore/containers/risk_score');
const mockUseRiskScore = useRiskScore as jest.Mock;

const timestamp = '2022-07-25T08:20:18.966Z';

const defaultProps = {
  userName: 'test user',
  timestamp,
  scopeId: 'scopeId',
};

const mockUserDetailsResponse = [
  false,
  {
    inspect: jest.fn(),
    refetch: jest.fn(),
    userDetails: { user: { name: ['test user'] } },
  },
];

const mockRiskScoreResponse = {
  data: [
    {
      user: {
        name: 'test user',
        risk: { calculated_level: 'low', calculated_score_norm: 40 },
      },
    },
  ],
  isAuthorized: true,
};

const mockRelatedHostsResponse = {
  inspect: jest.fn(),
  refetch: jest.fn(),
  relatedHosts: [{ host: 'test host', ip: ['100.XXX.XXX'], risk: RiskSeverity.low }],
  loading: false,
};

const renderUserDetails = () =>
  render(
    <TestProviders>
      <UserDetails {...defaultProps} />
    </TestProviders>
  );

describe('<UserDetails />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseMlUserPermissions.mockReturnValue({ isPlatinumOrTrialLicense: false, capabilities: {} });
    mockUseObservedUserDetails.mockReturnValue(mockUserDetailsResponse);
    mockUseRiskScore.mockReturnValue(mockRiskScoreResponse);
    mockUseUsersRelatedHosts.mockReturnValue(mockRelatedHostsResponse);
  });

  it('should render host details correctly', () => {
    const { getByTestId } = renderUserDetails();
    expect(getByTestId(EXPANDABLE_PANEL_CONTENT_TEST_ID(USER_DETAILS_TEST_ID))).toBeInTheDocument();
  });

  describe('Host overview', () => {
    it('should render the HostOverview with correct dates and indices', () => {
      const { getByTestId } = renderUserDetails();
      expect(mockUseObservedUserDetails).toBeCalledWith({
        id: 'entities-users-details-uuid',
        startDate: from,
        endDate: to,
        userName: 'test user',
        indexNames: ['index'],
        skip: false,
      });
      expect(getByTestId(USER_DETAILS_INFO_TEST_ID)).toBeInTheDocument();
    });

    it('should render user risk score when license is valid', () => {
      mockUseMlUserPermissions.mockReturnValue({
        isPlatinumOrTrialLicense: true,
        capabilities: {},
      });
      const { getByText } = renderUserDetails();
      expect(getByText('User risk score')).toBeInTheDocument();
    });

    it('should not render user risk score when license is not valid', () => {
      mockUseRiskScore.mockReturnValue({ data: [], isAuthorized: false });
      const { queryByText } = renderUserDetails();
      expect(queryByText('User risk score')).not.toBeInTheDocument();
    });
  });

  describe('Related hosts', () => {
    it('should render the related host table with correct dates and indices', () => {
      const { getByTestId } = renderUserDetails();
      expect(mockUseUsersRelatedHosts).toBeCalledWith({
        from: timestamp,
        userName: 'test user',
        indexNames: ['index'],
        skip: false,
      });
      expect(getByTestId(USER_DETAILS_RELATED_HOSTS_TABLE_TEST_ID)).toBeInTheDocument();
    });

    it('should render host risk score column when license is valid', () => {
      mockUseMlUserPermissions.mockReturnValue({
        isPlatinumOrTrialLicense: true,
        capabilities: {},
      });
      const { queryAllByRole } = renderUserDetails();
      expect(queryAllByRole('columnheader').length).toBe(3);
      expect(queryAllByRole('row')[1].textContent).toContain('test host');
      expect(queryAllByRole('row')[1].textContent).toContain('100.XXX.XXX');
      expect(queryAllByRole('row')[1].textContent).toContain('Low');
    });

    it('should not render host risk score column when license is not valid', () => {
      const { queryAllByRole } = renderUserDetails();
      expect(queryAllByRole('columnheader').length).toBe(2);
    });

    it('should render empty table if no related host is returned', () => {
      mockUseUsersRelatedHosts.mockReturnValue({
        ...mockRelatedHostsResponse,
        relatedHosts: [],
        loading: false,
      });

      const { getByTestId } = renderUserDetails();
      expect(getByTestId(USER_DETAILS_RELATED_HOSTS_TABLE_TEST_ID).textContent).toContain(
        'No hosts identified'
      );
    });
  });
});
