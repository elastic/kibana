/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render } from '@testing-library/react';
import { getHostRiskScoreColumns } from './columns';
import { TestProviders } from '../../../common/mock';
import type { HostRiskScoreColumns } from '.';

describe('getHostRiskScoreColumns', () => {
  test('should render host score rounded', () => {
    const columns: HostRiskScoreColumns = getHostRiskScoreColumns({
      dispatchSeverityUpdate: jest.fn(),
    });

    const riskScore = 10.11111111;
    const riskScoreColumn = columns[2];
    const renderedColumn = riskScoreColumn.render!(riskScore, null);

    const { queryByTestId } = render(<TestProviders>{renderedColumn}</TestProviders>);

    expect(queryByTestId('risk-score-truncate')).toHaveTextContent('10');
  });
});
