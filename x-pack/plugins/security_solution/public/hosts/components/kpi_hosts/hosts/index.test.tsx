/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useHostsKpiHosts } from '../../../containers/kpi_hosts/hosts';
import { useQueryToggle } from '../../../../common/containers/query_toggle';
import { render } from '@testing-library/react';
import { TestProviders } from '../../../../common/mock';
import React from 'react';
import { HostsKpiHosts } from '.';
import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';
import { useRefetchByRestartingSession } from '../../../../common/components/page/use_refetch_by_session';
import { KpiBaseComponentManage } from '../common';

jest.mock('../../../../common/containers/query_toggle');
jest.mock('../../../containers/kpi_hosts/hosts');
jest.mock('../common', () => ({
  KpiBaseComponentManage: jest
    .fn()
    .mockReturnValue(<span data-test-subj="KpiBaseComponentManage" />),
}));
jest.mock('../../../../common/hooks/use_experimental_features', () => ({
  useIsExperimentalFeatureEnabled: jest.fn(),
}));
jest.mock('../../../../common/components/page/use_refetch_by_session', () => ({
  useRefetchByRestartingSession: jest.fn(),
}));

describe('KPI Hosts', () => {
  const mockUseHostsKpiHosts = useHostsKpiHosts as jest.Mock;
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
  beforeEach(() => {
    mockUseQueryToggle.mockReturnValue({ toggleStatus: true, setToggleStatus: jest.fn() });
    mockUseHostsKpiHosts.mockReturnValue([
      false,
      {
        id: '123',
        inspect: {
          dsl: [],
          response: [],
        },
        refetch: mockRefetch,
      },
    ]);
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
        <HostsKpiHosts {...defaultProps} />
      </TestProviders>
    );
    expect(mockUseHostsKpiHosts.mock.calls[0][0].skip).toEqual(false);
  });
  it('toggleStatus=false, skip', () => {
    mockUseQueryToggle.mockReturnValue({ toggleStatus: false, setToggleStatus: jest.fn() });
    render(
      <TestProviders>
        <HostsKpiHosts {...defaultProps} />
      </TestProviders>
    );
    expect(mockUseHostsKpiHosts.mock.calls[0][0].skip).toEqual(true);
  });
  it('Refetches data', () => {
    mockUseQueryToggle.mockReturnValue({ toggleStatus: false, setToggleStatus: jest.fn() });
    render(
      <TestProviders>
        <HostsKpiHosts {...defaultProps} />
      </TestProviders>
    );
    expect(MockKpiBaseComponentManage.mock.calls[0][0].refetch).toEqual(mockRefetch);
    expect(MockKpiBaseComponentManage.mock.calls[0][0].searchSessionId).toBeUndefined();
  });
  it('Refetch by restarting search session ID if isChartEmbeddablesEnabled = true', () => {
    (useIsExperimentalFeatureEnabled as jest.Mock).mockReturnValue(true);

    render(
      <TestProviders>
        <HostsKpiHosts {...defaultProps} />
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
