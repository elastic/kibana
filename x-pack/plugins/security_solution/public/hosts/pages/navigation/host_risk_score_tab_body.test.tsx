/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { TestProviders } from '../../../common/mock';
import { useRiskScore, useRiskScoreKpi } from '../../../risk_score/containers';
import { useQueryToggle } from '../../../common/containers/query_toggle';
import { HostRiskScoreQueryTabBody } from './host_risk_score_tab_body';
import { HostsType } from '../../store/model';

jest.mock('../../../risk_score/containers');
jest.mock('../../../common/containers/query_toggle');
jest.mock('../../../common/lib/kibana');

describe('Host risk score query tab body', () => {
  const mockUseRiskScore = useRiskScore as jest.Mock;
  const mockUseRiskScoreKpi = useRiskScoreKpi as jest.Mock;
  const mockUseQueryToggle = useQueryToggle as jest.Mock;
  const defaultProps = {
    indexNames: [],
    setQuery: jest.fn(),
    skip: false,
    startDate: '2019-06-25T04:31:59.345Z',
    endDate: '2019-06-25T06:31:59.345Z',
    type: HostsType.page,
  };
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseQueryToggle.mockReturnValue({ toggleStatus: true, setToggleStatus: jest.fn() });
    mockUseRiskScoreKpi.mockReturnValue({
      loading: false,
      severityCount: {
        unknown: 12,
        low: 12,
        moderate: 12,
        high: 12,
        critical: 12,
      },
    });
    mockUseRiskScore.mockReturnValue([
      false,
      {
        hosts: [],
        id: '123',
        inspect: {
          dsl: [],
          response: [],
        },
        isInspected: false,
        totalCount: 0,
        pageInfo: { activePage: 1, fakeTotalCount: 100, showMorePagesIndicator: false },
        loadPage: jest.fn(),
        refetch: jest.fn(),
      },
    ]);
  });
  it('toggleStatus=true, do not skip', () => {
    render(
      <TestProviders>
        <HostRiskScoreQueryTabBody {...defaultProps} />
      </TestProviders>
    );
    expect(mockUseRiskScore.mock.calls[0][0].skip).toEqual(false);
    expect(mockUseRiskScoreKpi.mock.calls[0][0].skip).toEqual(false);
  });
  it('toggleStatus=false, skip', () => {
    mockUseQueryToggle.mockReturnValue({ toggleStatus: false, setToggleStatus: jest.fn() });
    render(
      <TestProviders>
        <HostRiskScoreQueryTabBody {...defaultProps} />
      </TestProviders>
    );
    expect(mockUseRiskScore.mock.calls[0][0].skip).toEqual(true);
    expect(mockUseRiskScoreKpi.mock.calls[0][0].skip).toEqual(true);
  });
});
