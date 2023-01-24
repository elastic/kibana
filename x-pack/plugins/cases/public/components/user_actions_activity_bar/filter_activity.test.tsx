/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { AppMockRenderer } from '../../common/mock';
import { createAppMockRenderer } from '../../common/mock';
import { waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { FilterActivity } from './filter_activity';

describe('FilterActivity ', () => {
  const onFilterActivityChange = jest.fn();
  let appMockRender: AppMockRenderer;

  beforeEach(() => {
    appMockRender = createAppMockRenderer();
  });

  it('renders filters correctly', () => {
    const res = appMockRender.render(
      <FilterActivity type="all" onFilterChange={onFilterActivityChange} />
    );

    expect(res.getByTestId('user-actions-filter-activity-group')).toBeInTheDocument();
    expect(res.getByTestId('user-actions-filter-activity-button-all')).toBeInTheDocument();
    expect(res.getByTestId('user-actions-filter-activity-button-comments')).toBeInTheDocument();
    expect(res.getByTestId('user-actions-filter-activity-button-actions')).toBeInTheDocument();
  });

  it('renders loading state correctly', () => {
    const res = appMockRender.render(
      <FilterActivity type="all" onFilterChange={onFilterActivityChange} isLoading />
    );

    expect(res.getAllByLabelText('Loading')).toHaveLength(3);
    expect(res.getAllByRole('progressbar')).toHaveLength(3);
  });

  it('renders all as active filter by default', () => {
    const res = appMockRender.render(
      <FilterActivity type="all" onFilterChange={onFilterActivityChange} />
    );

    expect(
      res
        .getByTestId('user-actions-filter-activity-button-all')
        .classList.contains('euiFilterButton-hasActiveFilters')
    );
  });

  it('renders comments as active filter', async () => {
    const res = appMockRender.render(
      <FilterActivity type="user" onFilterChange={onFilterActivityChange} />
    );

    await waitFor(() => {
      expect(
        res
          .getByTestId('user-actions-filter-activity-button-comments')
          .classList.contains('euiFilterButton-hasActiveFilters')
      );
    });
  });

  it('onChange is called with user filter type', async () => {
    const res = appMockRender.render(
      <FilterActivity type="all" onFilterChange={onFilterActivityChange} />
    );

    const commentsFilter = res.getByTestId('user-actions-filter-activity-button-comments');

    userEvent.click(commentsFilter);

    await waitFor(() => expect(onFilterActivityChange).toHaveBeenCalledWith('user'));
  });

  it('onChange is called with action filter type', async () => {
    const res = appMockRender.render(
      <FilterActivity type="user" onFilterChange={onFilterActivityChange} />
    );

    const actionsFilter = res.getByTestId('user-actions-filter-activity-button-actions');

    userEvent.click(actionsFilter);

    await waitFor(() => expect(onFilterActivityChange).toHaveBeenCalledWith('action'));
    await waitFor(() => {
      expect(
        res
          .getByTestId('user-actions-filter-activity-button-actions')
          .classList.contains('euiFilterButton-hasActiveFilters')
      );
    });
  });

  it('onChange is called with all filter type', async () => {
    const res = appMockRender.render(
      <FilterActivity type="action" onFilterChange={onFilterActivityChange} />
    );

    const actionsFilter = res.getByTestId('user-actions-filter-activity-button-all');

    userEvent.click(actionsFilter);

    await waitFor(() => expect(onFilterActivityChange).toHaveBeenCalledWith('all'));
    await waitFor(() => {
      expect(
        res
          .getByTestId('user-actions-filter-activity-button-all')
          .classList.contains('euiFilterButton-hasActiveFilters')
      );
    });
  });
});
