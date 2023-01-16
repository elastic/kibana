/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQueryToggle } from '../../../../../common/containers/query_toggle';
import { render } from '@testing-library/react';
import { TestProviders } from '../../../../../common/mock';
import React from 'react';
import { TotalUsersKpi } from '.';
import { useSearchStrategy } from '../../../../../common/containers/use_search_strategy';
import { useIsExperimentalFeatureEnabled } from '../../../../../common/hooks/use_experimental_features';
import { useRefetchByRestartingSession } from '../../../../../common/components/page/use_refetch_by_session';
import { KpiBaseComponentManage } from '../../../../hosts/components/kpi_hosts/common';

jest.mock('../../../../../common/containers/query_toggle');
jest.mock('../../../../../common/containers/use_search_strategy');
jest.mock('../../../../hosts/components/kpi_hosts/common', () => ({
  KpiBaseComponentManage: jest
    .fn()
    .mockReturnValue(<span data-test-subj="KpiBaseComponentManage" />),
}));
jest.mock('../../../../../common/hooks/use_experimental_features', () => ({
  useIsExperimentalFeatureEnabled: jest.fn(),
}));
jest.mock('../../../../../common/components/page/use_refetch_by_session', () => ({
  useRefetchByRestartingSession: jest.fn(),
}));

describe('Total Users KPI', () => {
  const mockUseSearchStrategy = useSearchStrategy as jest.Mock;
  const mockUseQueryToggle = useQueryToggle as jest.Mock;
  const MockKpiBaseComponentManage = KpiBaseComponentManage as jest.Mock;
  const mockRefetchByRestartingSession = jest.fn();
  const mockRefetch = jest.fn();
  const defaultProps = {
    from: '2019-06-25T04:31:59.345Z',
    to: '2019-06-25T06:31:59.345Z',
    indexNames: [],
    updateDateRange: jest.fn(),
    setQuery: jest.fn(),
    skip: false,
  };
  const mockSearch = jest.fn();
  beforeEach(() => {
    mockUseQueryToggle.mockReturnValue({ toggleStatus: true, setToggleStatus: jest.fn() });
    mockUseSearchStrategy.mockReturnValue({
      result: [],
      loading: false,
      inspect: {
        dsl: [],
        response: [],
      },
      search: mockSearch,
      refetch: mockRefetch,
    });
    (useIsExperimentalFeatureEnabled as jest.Mock).mockReturnValue(false);
    (useRefetchByRestartingSession as jest.Mock).mockReturnValue({
      searchSessionId: 'mockSearchSessionId',
      refetchByRestartingSession: mockRefetchByRestartingSession,
    });
  });
  afterEach(() => {
    jest.clearAllMocks();
  });
  it('toggleStatus=true, do not skip', () => {
    render(
      <TestProviders>
        <TotalUsersKpi {...defaultProps} />
      </TestProviders>
    );
    expect(mockUseSearchStrategy.mock.calls[0][0].abort).toEqual(false);
    expect(mockSearch).toHaveBeenCalled();
  });
  it('toggleStatus=false, skip', () => {
    mockUseQueryToggle.mockReturnValue({ toggleStatus: false, setToggleStatus: jest.fn() });
    render(
      <TestProviders>
        <TotalUsersKpi {...defaultProps} />
      </TestProviders>
    );
    expect(mockUseSearchStrategy.mock.calls[0][0].abort).toEqual(true);
    expect(mockSearch).not.toHaveBeenCalled();
  });
  it('Refetches data', () => {
    mockUseQueryToggle.mockReturnValue({ toggleStatus: false, setToggleStatus: jest.fn() });
    render(
      <TestProviders>
        <TotalUsersKpi {...defaultProps} />
      </TestProviders>
    );
    expect(MockKpiBaseComponentManage.mock.calls[0][0].refetch).toEqual(mockRefetch);
    expect(MockKpiBaseComponentManage.mock.calls[0][0].searchSessionId).toBeUndefined();
  });
  it('Refetch by restarting search session ID if isChartEmbeddablesEnabled = true', () => {
    (useIsExperimentalFeatureEnabled as jest.Mock).mockReturnValue(true);

    render(
      <TestProviders>
        <TotalUsersKpi {...defaultProps} />
      </TestProviders>
    );

    expect(MockKpiBaseComponentManage.mock.calls[0][0].refetch).toEqual(
      mockRefetchByRestartingSession
    );
    expect(MockKpiBaseComponentManage.mock.calls[0][0].searchSessionId).toEqual(
      'mockSearchSessionId'
    );
  });
});
