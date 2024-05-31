/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { AppMockRenderer } from '../../common/mock';
import { createAppMockRenderer } from '../../common/mock';
import { waitFor, fireEvent, screen } from '@testing-library/react';

import { SortActivity, sortOptions } from './sort_activity';

describe('SortActivity ', () => {
  const onSortActivityChange = jest.fn();
  let appMockRender: AppMockRenderer;

  beforeEach(() => {
    appMockRender = createAppMockRenderer();
  });

  it('renders correctly', () => {
    appMockRender.render(<SortActivity sortOrder="asc" onOrderChange={onSortActivityChange} />);

    expect(screen.getByTestId('user-actions-sort-select')).toBeInTheDocument();
  });

  it('renders loading state correctly', () => {
    appMockRender.render(
      <SortActivity sortOrder="asc" onOrderChange={onSortActivityChange} isLoading />
    );

    expect(screen.getByLabelText('Loading')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('renders options when opened', async () => {
    appMockRender.render(<SortActivity sortOrder="asc" onOrderChange={onSortActivityChange} />);

    expect(screen.getByText(`${sortOptions[0].text}`)).toBeInTheDocument();
    expect(screen.getByText(`${sortOptions[1].text}`)).toBeInTheDocument();
  });

  it('onChange is called with asc value', async () => {
    appMockRender.render(<SortActivity sortOrder="asc" onOrderChange={onSortActivityChange} />);

    const sortSelect = screen.getByTestId('user-actions-sort-select');

    fireEvent.change(sortSelect, { target: { value: sortOptions[1].value } });

    await waitFor(() => expect(onSortActivityChange).toHaveBeenCalledWith(sortOptions[1].value));
  });

  it('onChange is called with desc value', async () => {
    appMockRender.render(<SortActivity sortOrder="asc" onOrderChange={onSortActivityChange} />);

    const sortSelect = screen.getByTestId('user-actions-sort-select');

    fireEvent.change(sortSelect, { target: { value: sortOptions[0].value } });

    await waitFor(() => expect(onSortActivityChange).toHaveBeenCalledWith(sortOptions[0].value));
  });
});
