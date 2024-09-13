/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { screen, within } from '@testing-library/react';
import React from 'react';
import type { AppMockRenderer } from '../../common/mock';
import { createAppMockRenderer } from '../../common/mock';
import { useGetCasesMetrics } from '../../containers/use_get_cases_metrics';
import { useGetCasesStatus } from '../../containers/use_get_cases_status';
import { CasesMetrics } from './cases_metrics';

jest.mock('pretty-ms', () => jest.fn().mockReturnValue('2ms'));
jest.mock('../../containers/use_get_cases_metrics');
jest.mock('../../containers/use_get_cases_status');

const useGetCasesMetricsMock = useGetCasesMetrics as jest.Mock;
const useGetCasesStatusMock = useGetCasesStatus as jest.Mock;

describe('Cases metrics', () => {
  let appMockRenderer: AppMockRenderer;

  beforeEach(() => {
    useGetCasesMetricsMock.mockReturnValue({ isLoading: false, data: { mttr: 2000 } });
    useGetCasesStatusMock.mockReturnValue({
      isLoading: false,
      data: {
        countOpenCases: 20,
        countInProgressCases: 40,
        countClosedCases: 130,
      },
    });

    appMockRenderer = createAppMockRenderer();
  });

  it('renders the correct stats', async () => {
    appMockRenderer.render(<CasesMetrics />);

    expect(await screen.findByTestId('cases-metrics-stats')).toBeInTheDocument();

    expect(
      within(await screen.findByTestId('openStatsHeader')).getByText('20')
    ).toBeInTheDocument();

    expect(
      within(await screen.findByTestId('inProgressStatsHeader')).getByText('40')
    ).toBeInTheDocument();

    expect(
      within(await screen.findByTestId('closedStatsHeader')).getByText('130')
    ).toBeInTheDocument();

    expect(
      within(await screen.findByTestId('mttrStatsHeader')).getByText('2ms')
    ).toBeInTheDocument();
  });
});
