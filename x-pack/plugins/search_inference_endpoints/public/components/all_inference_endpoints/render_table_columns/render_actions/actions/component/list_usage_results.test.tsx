/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ListUsageResults } from './list_usage_results';
import { render, screen, fireEvent } from '@testing-library/react';

describe('ListUsageResults', () => {
  const items = [
    {
      label: 'index-1',
      type: 'Index',
    },
    {
      label: 'pipeline-1',
      type: 'Pipeline',
    },
  ];
  beforeEach(() => {
    render(<ListUsageResults list={items} />);
  });
  it('renders', () => {
    expect(screen.getByRole('searchbox')).toBeInTheDocument();
    expect(screen.getByText('index-1')).toBeInTheDocument();
    expect(screen.getByText('Index')).toBeInTheDocument();
    expect(screen.getByText('pipeline-1')).toBeInTheDocument();
    expect(screen.getByText('Pipeline')).toBeInTheDocument();
  });

  it('filters list based on search term', () => {
    const searchBox = screen.getByRole('searchbox');
    fireEvent.change(searchBox, { target: { value: 'index' } });
    expect(screen.getByText('index-1')).toBeInTheDocument();
    expect(screen.queryByText('pipeline-1')).not.toBeInTheDocument();
  });
});
