/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, fireEvent } from '@testing-library/react';
import React from 'react';
import { HostRiskInformation } from '.';
import { TestProviders } from '../../../common/mock';

describe('Host Risk Flyout', () => {
  it('renders', () => {
    const { queryByTestId } = render(<HostRiskInformation />);

    expect(queryByTestId('open-risk-information-flyout')).toBeInTheDocument();
  });

  it('opens and displays table with 5 rows', () => {
    const NUMBER_OF_ROWS = 1 + 5; // 1 header row + 5 severity rows
    const { getByTestId, queryByTestId, queryAllByRole } = render(
      <TestProviders>
        <HostRiskInformation />
      </TestProviders>
    );

    fireEvent.click(getByTestId('open-risk-information-flyout'));

    expect(queryByTestId('risk-information-table')).toBeInTheDocument();
    expect(queryAllByRole('row')).toHaveLength(NUMBER_OF_ROWS);
  });
});
