/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { within } from '@testing-library/dom';
import React from 'react';
import { AppMockRenderer, createAppMockRenderer } from '../../common/mock';
import { useGetCasesMetrics } from '../../containers/use_get_cases_metrics';
import { useGetCasesStatus } from '../../containers/use_get_cases_status';
import { CasesMetrics } from './cases_metrics';

jest.mock('../../containers/use_get_cases_metrics');
jest.mock('../../containers/use_get_cases_status');

const useGetCasesMetricsMock = useGetCasesMetrics as jest.Mock;
const useGetCasesStatusMock = useGetCasesStatus as jest.Mock;

describe('Cases metrics', () => {
  useGetCasesStatusMock.mockReturnValue({
    countOpenCases: 2,
    countInProgressCases: 3,
    countClosedCases: 4,
    isLoading: false,
    fetchCasesStatus: jest.fn(),
  });
  useGetCasesMetricsMock.mockReturnValue({
    //  600 seconds = 10m
    mttr: 600,
    isLoading: false,
    fetchCasesMetrics: jest.fn(),
  });

  let appMockRenderer: AppMockRenderer;

  beforeEach(() => {
    appMockRenderer = createAppMockRenderer();
  });

  it('renders the correct stats', () => {
    const result = appMockRenderer.render(<CasesMetrics refresh={1} />);
    expect(result.getByTestId('cases-metrics-stats')).toBeTruthy();
    expect(within(result.getByTestId('openStatsHeader')).getByText(2)).toBeTruthy();
    expect(within(result.getByTestId('inProgressStatsHeader')).getByText(3)).toBeTruthy();
    expect(within(result.getByTestId('closedStatsHeader')).getByText(4)).toBeTruthy();
    expect(within(result.getByTestId('mttrStatsHeader')).getByText('10m')).toBeTruthy();
  });
});
