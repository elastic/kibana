/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render as reactRender, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { cloneDeep } from 'lodash';
import {
  BenchmarksSection,
  TABLE_COLUMN_SCORE_TEST_ID,
  TABLE_HEADER_TEST_ID,
  TABLE_HEADER_SCORE_TEST_ID,
} from './benchmarks_section';
import { mockDashboardData, clusterMockData } from '../mock';
import { TestProvider } from '../../../test/test_provider';
import { KSPM_POLICY_TEMPLATE, CSPM_POLICY_TEMPLATE } from '../../../../common/constants';

describe('<BenchmarksSection />', () => {
  const render = (alterMockData = {}, dashboardType: 'kspm' | 'cspm' = KSPM_POLICY_TEMPLATE) =>
    reactRender(
      <TestProvider>
        <BenchmarksSection
          complianceData={{ ...mockDashboardData, ...alterMockData }}
          dashboardType={dashboardType}
        />
      </TestProvider>
    );

  describe('Sorting', () => {
    const mockDashboardDataCopy = cloneDeep(mockDashboardData);
    const clusterMockDataCopy = cloneDeep(clusterMockData);
    clusterMockDataCopy.stats.postureScore = 50;
    clusterMockDataCopy.meta.clusterId = '1';

    const clusterMockDataCopy1 = cloneDeep(clusterMockData);
    clusterMockDataCopy1.stats.postureScore = 95;
    clusterMockDataCopy1.meta.clusterId = '2';

    const clusterMockDataCopy2 = cloneDeep(clusterMockData);
    clusterMockDataCopy2.stats.postureScore = 45;
    clusterMockDataCopy2.meta.clusterId = '3';

    mockDashboardDataCopy.clusters = [
      clusterMockDataCopy,
      clusterMockDataCopy1,
      clusterMockDataCopy2,
    ];

    it('Should init sorted by Compliance Score DESC', () => {
      const { getAllByTestId } = render(mockDashboardDataCopy);

      expect(getAllByTestId(TABLE_COLUMN_SCORE_TEST_ID)[0]).toHaveTextContent('95');
      expect(getAllByTestId(TABLE_COLUMN_SCORE_TEST_ID)[1]).toHaveTextContent('50');
      expect(getAllByTestId(TABLE_COLUMN_SCORE_TEST_ID)[2]).toHaveTextContent('45');
    });

    it('Should toggle sort order when clicking on Compliance Score', () => {
      const { getAllByTestId } = render(mockDashboardDataCopy);

      userEvent.click(screen.getByTestId(TABLE_HEADER_SCORE_TEST_ID));

      expect(getAllByTestId(TABLE_COLUMN_SCORE_TEST_ID)[0]).toHaveTextContent('45');
      expect(getAllByTestId(TABLE_COLUMN_SCORE_TEST_ID)[1]).toHaveTextContent('50');
      expect(getAllByTestId(TABLE_COLUMN_SCORE_TEST_ID)[2]).toHaveTextContent('95');

      userEvent.click(screen.getByTestId(TABLE_HEADER_SCORE_TEST_ID));

      expect(getAllByTestId(TABLE_COLUMN_SCORE_TEST_ID)[0]).toHaveTextContent('95');
      expect(getAllByTestId(TABLE_COLUMN_SCORE_TEST_ID)[1]).toHaveTextContent('50');
      expect(getAllByTestId(TABLE_COLUMN_SCORE_TEST_ID)[2]).toHaveTextContent('45');
    });
  });

  describe('KSPM Dashboard', () => {
    it('Should render the column headers', () => {
      const { getAllByTestId } = render();

      const columns = ['Cluster Name', 'Compliance Score', 'Compliance by CIS Section'];

      columns.forEach((name, idx) => {
        expect(getAllByTestId(TABLE_HEADER_TEST_ID)[idx]).toHaveTextContent(name);
      });
    });

    it.todo('Should navigate to the Findings page from the Cluster column');
    it.todo('Should navigate to the Findings page from the CIS section column');
  });

  describe('CSPM  Dashboard', () => {
    it('Should render the column headers', () => {
      const { getAllByTestId } = render({}, CSPM_POLICY_TEMPLATE);

      const columns = ['Account Name', 'Compliance Score', 'Compliance by CIS Section'];

      columns.forEach((name, idx) => {
        expect(getAllByTestId(TABLE_HEADER_TEST_ID)[idx]).toHaveTextContent(name);
      });
    });

    it.todo('Should navigate to the Findings page from the Cluster column');
    it.todo('Should navigate to the Findings page from the CIS section column');
  });
});
