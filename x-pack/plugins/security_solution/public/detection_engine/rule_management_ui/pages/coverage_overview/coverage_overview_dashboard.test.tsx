/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import React from 'react';
import { useFetchCoverageOverviewQuery } from '../../../rule_management/api/hooks/use_fetch_coverage_overview';

import { getMockCoverageOverviewDashboard } from '../../../rule_management/model/coverage_overview/__mocks__';
import { TestProviders } from '../../../../common/mock';
import { CoverageOverviewDashboard } from './coverage_overview_dashboard';
import { CoverageOverviewDashboardContextProvider } from './coverage_overview_dashboard_context';

jest.mock('../../../../common/utils/route/spy_routes', () => ({ SpyRoute: () => null }));
jest.mock('../../../rule_management/api/hooks/use_fetch_coverage_overview');

(useFetchCoverageOverviewQuery as jest.Mock).mockReturnValue({
  data: getMockCoverageOverviewDashboard(),
  isLoading: false,
  refetch: jest.fn(),
});

const renderCoverageOverviewDashboard = () => {
  return render(
    <TestProviders>
      <CoverageOverviewDashboardContextProvider>
        <CoverageOverviewDashboard />
      </CoverageOverviewDashboardContextProvider>
    </TestProviders>
  );
};

describe('CoverageOverviewDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('it renders', () => {
    renderCoverageOverviewDashboard();
    expect(useFetchCoverageOverviewQuery).toHaveBeenCalled();
  });
});
