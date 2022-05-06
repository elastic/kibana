/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { TestProviders } from '../../../common/mock';
import { useQueryToggle } from '../../../common/containers/query_toggle';

import { useHostRiskScore } from '../../../risk_score/containers';
import { HostRiskTabBody } from './host_risk_tab_body';
import { HostsType } from '../../store/model';

jest.mock('../../../risk_score/containers');
jest.mock('../../../common/containers/query_toggle');
jest.mock('../../../common/lib/kibana');

describe('Host query tab body', () => {
  const mockUseUserRiskScore = useHostRiskScore as jest.Mock;
  const mockUseQueryToggle = useQueryToggle as jest.Mock;
  const defaultProps = {
    hostName: 'testUser',
    indexNames: [],
    setQuery: jest.fn(),
    skip: false,
    startDate: '2019-06-25T04:31:59.345Z',
    endDate: '2019-06-25T06:31:59.345Z',
    type: HostsType.page,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseUserRiskScore.mockReturnValue([
      false,
      {
        inspect: {
          dsl: [],
          response: [],
        },
        isInspected: false,
        totalCount: 0,
        refetch: jest.fn(),
        isModuleEnabled: true,
      },
    ]);
  });

  it("doesn't skip when both toggleStatus are true", () => {
    mockUseQueryToggle.mockReturnValueOnce({ toggleStatus: true, setToggleStatus: jest.fn() });
    mockUseQueryToggle.mockReturnValueOnce({ toggleStatus: true, setToggleStatus: jest.fn() });

    render(
      <TestProviders>
        <HostRiskTabBody {...defaultProps} />
      </TestProviders>
    );
    expect(mockUseUserRiskScore.mock.calls[0][0].skip).toEqual(false);
  });

  it("doesn't skip when at least one toggleStatus is true", () => {
    mockUseQueryToggle.mockReturnValueOnce({ toggleStatus: true, setToggleStatus: jest.fn() });
    mockUseQueryToggle.mockReturnValueOnce({ toggleStatus: false, setToggleStatus: jest.fn() });

    render(
      <TestProviders>
        <HostRiskTabBody {...defaultProps} />
      </TestProviders>
    );
    expect(mockUseUserRiskScore.mock.calls[0][0].skip).toEqual(false);
  });

  it('does skip when both toggleStatus are false', () => {
    mockUseQueryToggle.mockReturnValueOnce({ toggleStatus: false, setToggleStatus: jest.fn() });
    mockUseQueryToggle.mockReturnValueOnce({ toggleStatus: false, setToggleStatus: jest.fn() });

    render(
      <TestProviders>
        <HostRiskTabBody {...defaultProps} />
      </TestProviders>
    );
    expect(mockUseUserRiskScore.mock.calls[0][0].skip).toEqual(true);
  });
});
