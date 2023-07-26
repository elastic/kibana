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
import { CoverageOverviewPage } from '.';

jest.mock('../../../../common/utils/route/spy_routes', () => ({ SpyRoute: () => null }));
jest.mock('../../../rule_management/api/hooks/use_fetch_coverage_overview');

(useFetchCoverageOverviewQuery as jest.Mock).mockReturnValue({
  data: getMockCoverageOverviewDashboard(),
});

const renderCoverageOverviewDashboard = () => {
  return render(
    <TestProviders>
      <CoverageOverviewPage />
    </TestProviders>
  );
};

describe('CoverageOverviewPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('it renders', () => {
    const wrapper = renderCoverageOverviewDashboard();

    expect(wrapper.getByTestId('coverageOverviewPage')).toBeInTheDocument();
    expect(useFetchCoverageOverviewQuery).toHaveBeenCalled();
  });
});
