/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, fireEvent } from '@testing-library/react';
import React from 'react';
import { TopHostScoreContributors } from '.';
import { TestProviders } from '../../../common/mock';
import { useHostRiskScore } from '../../../risk_score/containers';
import { useQueryToggle } from '../../../common/containers/query_toggle';

jest.mock('../../../common/containers/query_toggle');
jest.mock('../../../risk_score/containers');
const useHostRiskScoreMock = useHostRiskScore as jest.Mock;
const testProps = {
  setQuery: jest.fn(),
  deleteQuery: jest.fn(),
  hostName: 'test-host-name',
  from: '2020-07-07T08:20:18.966Z',
  to: '2020-07-08T08:20:18.966Z',
};
describe('Host Risk Flyout', () => {
  const mockUseQueryToggle = useQueryToggle as jest.Mock;
  const mockSetToggle = jest.fn();
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseQueryToggle.mockReturnValue({ toggleStatus: true, setToggleStatus: mockSetToggle });
  });
  it('renders', () => {
    useHostRiskScoreMock.mockReturnValueOnce([
      true,
      {
        data: [],
        isModuleEnabled: true,
      },
    ]);

    const { queryByTestId } = render(
      <TestProviders>
        <TopHostScoreContributors {...testProps} />
      </TestProviders>
    );

    expect(queryByTestId('topHostScoreContributors')).toBeInTheDocument();
  });

  it('renders sorted items', () => {
    useHostRiskScoreMock.mockReturnValueOnce([
      true,
      {
        data: [
          {
            risk_stats: {
              rule_risks: [
                {
                  rule_name: 'third',
                  rule_risk: '10',
                },
                {
                  rule_name: 'first',
                  rule_risk: '99',
                },
                {
                  rule_name: 'second',
                  rule_risk: '55',
                },
              ],
            },
          },
        ],
        isModuleEnabled: true,
      },
    ]);

    const { queryAllByRole } = render(
      <TestProviders>
        <TopHostScoreContributors {...testProps} />
      </TestProviders>
    );

    expect(queryAllByRole('row')[1]).toHaveTextContent('first');
    expect(queryAllByRole('row')[2]).toHaveTextContent('second');
    expect(queryAllByRole('row')[3]).toHaveTextContent('third');
  });

  describe('toggleQuery', () => {
    beforeEach(() => {
      useHostRiskScoreMock.mockReturnValue([
        true,
        {
          data: [],
          isModuleEnabled: true,
        },
      ]);
    });

    test('toggleQuery updates toggleStatus', () => {
      const { getByTestId } = render(
        <TestProviders>
          <TopHostScoreContributors {...testProps} />
        </TestProviders>
      );
      expect(useHostRiskScoreMock.mock.calls[0][0].skip).toEqual(false);
      fireEvent.click(getByTestId('query-toggle-header'));
      expect(mockSetToggle).toBeCalledWith(false);
      expect(useHostRiskScoreMock.mock.calls[1][0].skip).toEqual(true);
    });

    test('toggleStatus=true, do not skip', () => {
      render(
        <TestProviders>
          <TopHostScoreContributors {...testProps} />
        </TestProviders>
      );
      expect(useHostRiskScoreMock.mock.calls[0][0].skip).toEqual(false);
    });

    test('toggleStatus=true, render components', () => {
      const { queryByTestId } = render(
        <TestProviders>
          <TopHostScoreContributors {...testProps} />
        </TestProviders>
      );
      expect(queryByTestId('topHostScoreContributors-table')).toBeTruthy();
    });

    test('toggleStatus=false, do not render components', () => {
      mockUseQueryToggle.mockReturnValue({ toggleStatus: false, setToggleStatus: mockSetToggle });
      const { queryByTestId } = render(
        <TestProviders>
          <TopHostScoreContributors {...testProps} />
        </TestProviders>
      );
      expect(queryByTestId('topHostScoreContributors-table')).toBeFalsy();
    });

    test('toggleStatus=false, skip', () => {
      mockUseQueryToggle.mockReturnValue({ toggleStatus: false, setToggleStatus: mockSetToggle });
      render(
        <TestProviders>
          <TopHostScoreContributors {...testProps} />
        </TestProviders>
      );
      expect(useHostRiskScoreMock.mock.calls[0][0].skip).toEqual(true);
    });
  });
});
