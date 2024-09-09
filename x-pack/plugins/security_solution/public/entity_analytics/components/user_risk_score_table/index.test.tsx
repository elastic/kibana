/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import { noop } from 'lodash';
import React from 'react';
import { UserRiskScoreTable } from '.';
import type { UserRiskScore } from '../../../../common/search_strategy';
import { RiskSeverity } from '../../../../common/search_strategy';
import { TestProviders } from '../../../common/mock';
import { UsersType } from '../../../explore/users/store/model';

describe('UserRiskScoreTable', () => {
  const username = 'test_user_name';
  const defaultProps = {
    data: [
      {
        '@timestamp': '1641902481',
        user: {
          name: username,
          risk: {
            rule_risks: [],
            calculated_score_norm: 71,
            calculated_level: RiskSeverity.High,
            multipliers: [],
            '@timestamp': '',
            id_field: '',
            id_value: '',
            calculated_score: 0,
            category_1_score: 0,
            category_1_count: 0,
            category_2_score: 0,
            category_2_count: 0,
            notes: [],
            inputs: [],
          },
        },
      },
    ] as UserRiskScore[],
    id: 'test_id',
    isInspect: false,
    loading: false,
    loadPage: noop,
    setQuerySkip: jest.fn(),
    severityCount: {
      Unknown: 0,
      Low: 0,
      Moderate: 0,
      High: 0,
      Critical: 0,
    },
    totalCount: 0,
    type: UsersType.page,
  };

  it('renders', () => {
    const { queryByTestId } = render(
      <TestProviders>
        <UserRiskScoreTable {...defaultProps} />
      </TestProviders>
    );

    expect(queryByTestId('users-link-anchor')).toHaveTextContent(username);
  });
});
