/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useNetworkKpiUniqueFlows } from '../../../containers/kpi_network/unique_flows';
import { useQueryToggle } from '../../../../common/containers/query_toggle';
import { render } from '@testing-library/react';
import { TestProviders } from '../../../../common/mock';
import React from 'react';
import { NetworkKpiUniqueFlows } from './index';

jest.mock('../../../../common/containers/query_toggle');
jest.mock('../../../containers/kpi_network/unique_flows');
jest.mock('../../../../hosts/components/kpi_hosts/common', () => ({
  KpiBaseComponentManage: () => <span data-test-subj="KpiBaseComponentManage" />,
}));

describe('Unique Flows KPI', () => {
  const mockUseNetworkKpiUniqueFlows = useNetworkKpiUniqueFlows as jest.Mock;
  const mockUseQueryToggle = useQueryToggle as jest.Mock;
  const defaultProps = {
    from: '2019-06-25T04:31:59.345Z',
    to: '2019-06-25T06:31:59.345Z',
    indexNames: [],
    narrowDateRange: jest.fn(),
    setQuery: jest.fn(),
    skip: false,
  };
  beforeEach(() => {
    mockUseQueryToggle.mockReturnValue({ toggleStatus: true, setToggleStatus: jest.fn() });
    mockUseNetworkKpiUniqueFlows.mockReturnValue([
      false,
      {
        id: '123',
        inspect: {
          dsl: [],
          response: [],
        },
        refetch: jest.fn(),
      },
    ]);
  });
  afterEach(() => {
    jest.clearAllMocks();
  });
  it('toggleStatus=true, do not skip', () => {
    render(
      <TestProviders>
        <NetworkKpiUniqueFlows {...defaultProps} />
      </TestProviders>
    );
    expect(mockUseNetworkKpiUniqueFlows.mock.calls[0][0].skip).toEqual(false);
  });
  it('toggleStatus=false, skip', () => {
    mockUseQueryToggle.mockReturnValue({ toggleStatus: false, setToggleStatus: jest.fn() });
    render(
      <TestProviders>
        <NetworkKpiUniqueFlows {...defaultProps} />
      </TestProviders>
    );
    expect(mockUseNetworkKpiUniqueFlows.mock.calls[0][0].skip).toEqual(true);
  });
});
