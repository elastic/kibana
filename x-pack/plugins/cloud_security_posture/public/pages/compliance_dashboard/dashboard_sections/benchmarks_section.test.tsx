/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BenchmarksSection } from './benchmarks_section';
import { getMockDashboardData, getClusterMockData } from '../mock';
import { TestProvider } from '../../../test/test_provider';
import { KSPM_POLICY_TEMPLATE } from '../../../../common/constants';
import {
  DASHBOARD_TABLE_COLUMN_SCORE_TEST_ID,
  DASHBOARD_TABLE_HEADER_SCORE_TEST_ID,
} from '../../findings/test_subjects';

describe('<BenchmarksSection />', () => {
  const renderBenchmarks = (alterMockData = {}) =>
    render(
      <TestProvider>
        <BenchmarksSection
          complianceData={{ ...getMockDashboardData(), ...alterMockData }}
          dashboardType={KSPM_POLICY_TEMPLATE}
        />
      </TestProvider>
    );

  describe('Sorting', () => {
    const mockDashboardDataCopy = getMockDashboardData();
    const clusterMockDataCopy = getClusterMockData();
    clusterMockDataCopy.stats.postureScore = 50;
    clusterMockDataCopy.meta.clusterId = '1';

    const clusterMockDataCopy1 = getClusterMockData();
    clusterMockDataCopy1.stats.postureScore = 95;
    clusterMockDataCopy1.meta.clusterId = '2';

    const clusterMockDataCopy2 = getClusterMockData();
    clusterMockDataCopy2.stats.postureScore = 45;
    clusterMockDataCopy2.meta.clusterId = '3';

    mockDashboardDataCopy.clusters = [
      clusterMockDataCopy,
      clusterMockDataCopy1,
      clusterMockDataCopy2,
    ];

    it('sorts by ascending order of compliance scores', () => {
      const { getAllByTestId } = renderBenchmarks(mockDashboardDataCopy);
      expect(getAllByTestId(DASHBOARD_TABLE_COLUMN_SCORE_TEST_ID)[0]).toHaveTextContent('45');
      expect(getAllByTestId(DASHBOARD_TABLE_COLUMN_SCORE_TEST_ID)[1]).toHaveTextContent('50');
      expect(getAllByTestId(DASHBOARD_TABLE_COLUMN_SCORE_TEST_ID)[2]).toHaveTextContent('95');
    });

    it('toggles sort order when clicking Compliance Score', () => {
      const { getAllByTestId, getByTestId } = renderBenchmarks(mockDashboardDataCopy);

      userEvent.click(getByTestId(DASHBOARD_TABLE_HEADER_SCORE_TEST_ID));

      expect(getAllByTestId(DASHBOARD_TABLE_COLUMN_SCORE_TEST_ID)[0]).toHaveTextContent('95');
      expect(getAllByTestId(DASHBOARD_TABLE_COLUMN_SCORE_TEST_ID)[1]).toHaveTextContent('50');
      expect(getAllByTestId(DASHBOARD_TABLE_COLUMN_SCORE_TEST_ID)[2]).toHaveTextContent('45');

      userEvent.click(getByTestId(DASHBOARD_TABLE_HEADER_SCORE_TEST_ID));

      expect(getAllByTestId(DASHBOARD_TABLE_COLUMN_SCORE_TEST_ID)[0]).toHaveTextContent('45');
      expect(getAllByTestId(DASHBOARD_TABLE_COLUMN_SCORE_TEST_ID)[1]).toHaveTextContent('50');
      expect(getAllByTestId(DASHBOARD_TABLE_COLUMN_SCORE_TEST_ID)[2]).toHaveTextContent('95');
    });
  });
});
