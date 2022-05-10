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
import { TestProviders } from '../../../common/mock';
import { UsersType } from '../../store/model';

describe('UserRiskScoreTable', () => {
  const username = 'test_user_name';
  const defaultProps = {
    data: [
      {
        '@timestamp': '1641902481',
        risk: 'High',
        risk_stats: {
          rule_risks: [],
          risk_score: 71,
        },
        user: {
          name: username,
        },
      },
    ],
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
