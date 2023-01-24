/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { AppMockRenderer } from '../../common/mock';
import { createAppMockRenderer } from '../../common/mock';
import { waitFor, fireEvent } from '@testing-library/react';

import { SortActivity, SortOptions } from './sort_activity';

describe('SortActivity ', () => {
  const onSortActivityChange = jest.fn();
  let appMockRender: AppMockRenderer;

  beforeEach(() => {
    appMockRender = createAppMockRenderer();
  });

  it('renders correctly', () => {
    const res = appMockRender.render(
      <SortActivity sortOrder="asc" onOrderChange={onSortActivityChange} />
    );

    expect(res.getByTestId('user-actions-sort-select')).toBeInTheDocument();
  });

  it('renders loading state correctly', () => {
    const res = appMockRender.render(
      <SortActivity sortOrder="asc" onOrderChange={onSortActivityChange} isLoading />
    );

    expect(res.getByLabelText('Loading')).toBeInTheDocument();
    expect(res.getByRole('progressbar')).toBeInTheDocument();
  });

  it('renders options when opened', async () => {
    const res = appMockRender.render(
      <SortActivity sortOrder="asc" onOrderChange={onSortActivityChange} />
    );

    expect(res.getByText(`${SortOptions[0].text}`)).toBeInTheDocument();
    expect(res.getByText(`${SortOptions[1].text}`)).toBeInTheDocument();
  });

  it('onChange is called with asc value', async () => {
    const res = appMockRender.render(
      <SortActivity sortOrder="asc" onOrderChange={onSortActivityChange} />
    );

    const sortSelect = res.getByTestId('user-actions-sort-select');

    fireEvent.change(sortSelect, { target: { value: SortOptions[1].value } });

    await waitFor(() => expect(onSortActivityChange).toHaveBeenCalledWith(SortOptions[1].value));
  });

  it('onChange is called with dsc value', async () => {
    const res = appMockRender.render(
      <SortActivity sortOrder="asc" onOrderChange={onSortActivityChange} />
    );

    const sortSelect = res.getByTestId('user-actions-sort-select');

    fireEvent.change(sortSelect, { target: { value: SortOptions[0].value } });

    await waitFor(() => expect(onSortActivityChange).toHaveBeenCalledWith(SortOptions[0].value));
  });
});
