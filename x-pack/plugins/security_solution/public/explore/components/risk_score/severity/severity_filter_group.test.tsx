/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { SeverityFilterGroup } from './severity_filter_group';
import { RiskSeverity } from '../../../../../common/search_strategy';
import { TestProviders } from '../../../../common/mock';

describe('SeverityFilterGroup', () => {
  it('preserves sort order when severityCount is out of order', () => {
    const { getByTestId, getAllByTestId } = render(
      <TestProviders>
        <SeverityFilterGroup
          selectedSeverities={[]}
          severityCount={{
            [RiskSeverity.high]: 0,
            [RiskSeverity.low]: 0,
            [RiskSeverity.critical]: 0,
            [RiskSeverity.moderate]: 0,
            [RiskSeverity.unknown]: 0,
          }}
          title={'test title'}
          onSelect={jest.fn()}
        />
      </TestProviders>
    );

    fireEvent.click(getByTestId('risk-filter-button'));

    expect(getAllByTestId('risk-score').map((ele) => ele.textContent)).toEqual([
      'Unknown',
      'Low',
      'Moderate',
      'High',
      'Critical',
    ]);
  });
});
