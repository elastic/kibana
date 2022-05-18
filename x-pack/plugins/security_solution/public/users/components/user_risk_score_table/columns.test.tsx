/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render } from '@testing-library/react';
import { UserRiskScoreColumns } from '.';
import { getUserRiskScoreColumns } from './columns';
import { TestProviders } from '../../../common/mock';

describe('getUserRiskScoreColumns', () => {
  const defaultProps = {
    dispatchSeverityUpdate: jest.fn(),
  };

  test('should have expected fields', () => {
    const columns = getUserRiskScoreColumns(defaultProps);

    expect(columns[0].field).toBe('user.name');
    expect(columns[1].field).toBe('risk_stats.risk_score');
    expect(columns[2].field).toBe('risk');

    columns.forEach((column) => {
      expect(column).toHaveProperty('name');
      expect(column).toHaveProperty('render');
      expect(column).toHaveProperty('sortable');
    });
  });

  test('should render user detail link', () => {
    const username = 'test_user_name';
    const columns: UserRiskScoreColumns = getUserRiskScoreColumns(defaultProps);
    const usernameColumn = columns[0];
    const renderedColumn = usernameColumn.render!(username, null);

    const { queryByTestId } = render(<TestProviders>{renderedColumn}</TestProviders>);

    expect(queryByTestId('users-link-anchor')).toHaveTextContent(username);
  });

  test('should render user score truncated', () => {
    const columns: UserRiskScoreColumns = getUserRiskScoreColumns(defaultProps);

    const riskScore = 10.11111111;
    const riskScoreColumn = columns[1];
    const renderedColumn = riskScoreColumn.render!(riskScore, null);

    const { queryByTestId } = render(<TestProviders>{renderedColumn}</TestProviders>);

    expect(queryByTestId('risk-score-truncate')).toHaveTextContent('10.11');
  });
});
