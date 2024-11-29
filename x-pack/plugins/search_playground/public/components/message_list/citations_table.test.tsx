/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { CitationsTable } from './citations_table';

jest.mock('../../hooks/use_usage_tracker', () => ({
  useUsageTracker: () => ({
    count: jest.fn(),
    load: jest.fn(),
    click: jest.fn(),
  }),
}));
describe('CitationsTable component', () => {
  const citationsMock = [
    {
      metadata: {
        _id: '1',
        _score: 0.5,
        _index: 'index1',
      },
      content: 'Lorem ipsum dolor sit amet.',
    },
    {
      metadata: {
        _id: '2',
        _score: 0.5,
        _index: 'index1',
      },
      content: 'Consectetur adipiscing elit.',
    },
  ];

  it('should expand row on snippet button click', () => {
    const { getByTestId, getByText, queryByText } = render(
      <CitationsTable citations={citationsMock} />
    );

    expect(queryByText('Lorem ipsum dolor sit amet.')).not.toBeInTheDocument();

    fireEvent.click(getByTestId('expandButton-1'));

    expect(getByText('Lorem ipsum dolor sit amet.')).toBeInTheDocument();
  });
});
