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

import { useHostRiskScore, useUserRiskScore } from '../../containers';
import { RiskTabBody } from '.';
import { RiskScoreEntity } from '../../../../common/search_strategy';
import { HostsType } from '../../../hosts/store/model';
import { UsersType } from '../../../users/store/model';

jest.mock('../../containers');
jest.mock('../../../common/containers/query_toggle');
jest.mock('../../../common/lib/kibana');
describe.each([RiskScoreEntity.host, RiskScoreEntity.user])(
  'Risk Tab Body entityType: %s',
  (riskEntity) => {
    const defaultProps = {
      entityName: 'testUser',
      indexNames: [],
      setQuery: jest.fn(),
      skip: false,
      startDate: '2019-06-25T04:31:59.345Z',
      endDate: '2019-06-25T06:31:59.345Z',
      type: riskEntity === RiskScoreEntity.host ? HostsType.page : UsersType.page,
      riskEntity,
    };

    const mockUseRiskScore = (
      riskEntity === RiskScoreEntity.host ? useHostRiskScore : useUserRiskScore
    ) as jest.Mock;
    const mockUseQueryToggle = useQueryToggle as jest.Mock;
    beforeEach(() => {
      jest.clearAllMocks();

      mockUseRiskScore.mockReturnValue([
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
      mockUseQueryToggle.mockReturnValue({ toggleStatus: true, setToggleStatus: jest.fn() });
    });

    it("doesn't skip when both toggleStatus are true", () => {
      render(
        <TestProviders>
          <RiskTabBody {...defaultProps} />
        </TestProviders>
      );
      expect(mockUseRiskScore.mock.calls[0][0].skip).toEqual(false);
    });

    it("doesn't skip when at least one toggleStatus is true", () => {
      mockUseQueryToggle.mockReturnValueOnce({ toggleStatus: true, setToggleStatus: jest.fn() });
      mockUseQueryToggle.mockReturnValueOnce({ toggleStatus: false, setToggleStatus: jest.fn() });

      render(
        <TestProviders>
          <RiskTabBody {...defaultProps} />
        </TestProviders>
      );
      expect(mockUseRiskScore.mock.calls[0][0].skip).toEqual(false);
    });

    it('does skip when both toggleStatus are false', () => {
      mockUseQueryToggle.mockReturnValue({ toggleStatus: false, setToggleStatus: jest.fn() });

      render(
        <TestProviders>
          <RiskTabBody {...defaultProps} />
        </TestProviders>
      );
      expect(mockUseRiskScore.mock.calls[0][0].skip).toEqual(true);
    });
  }
);
