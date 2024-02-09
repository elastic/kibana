/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { AppMockRenderer } from '../../common/mock';
import { createAppMockRenderer } from '../../common/mock';
import { waitFor, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { CaseUserActionsStats } from '../../containers/types';

import { FilterActivity } from './filter_activity';

describe('FilterActivity ', () => {
  const onFilterActivityChange = jest.fn();
  let appMockRender: AppMockRenderer;
  const userActionsStats: CaseUserActionsStats = {
    total: 20,
    totalComments: 11,
    totalOtherActions: 9,
  };

  beforeEach(() => {
    appMockRender = createAppMockRenderer();
  });

  it('renders filters correctly', async () => {
    appMockRender.render(<FilterActivity type="all" onFilterChange={onFilterActivityChange} />);

    expect(await screen.findByTestId('user-actions-filter-activity-group')).toBeInTheDocument();
    expect(
      await screen.findByTestId('user-actions-filter-activity-button-all')
    ).toBeInTheDocument();
    expect(
      await screen.findByTestId('user-actions-filter-activity-button-comments')
    ).toBeInTheDocument();
    expect(
      await screen.findByTestId('user-actions-filter-activity-button-history')
    ).toBeInTheDocument();
  });

  it('renders loading state correctly', () => {
    appMockRender.render(
      <FilterActivity type="all" onFilterChange={onFilterActivityChange} isLoading />
    );

    expect(screen.getAllByLabelText('Loading')).toHaveLength(3);
    expect(screen.getAllByRole('progressbar')).toHaveLength(3);
  });

  it('renders all as active filter by default', async () => {
    appMockRender.render(<FilterActivity type="all" onFilterChange={onFilterActivityChange} />);

    expect(
      (await screen.findByTestId('user-actions-filter-activity-button-all')).classList.contains(
        'euiFilterButton-hasActiveFilters'
      )
    );
  });

  it('renders comments as active filter', async () => {
    appMockRender.render(<FilterActivity type="user" onFilterChange={onFilterActivityChange} />);

    expect(
      (
        await screen.findByTestId('user-actions-filter-activity-button-comments')
      ).classList.contains('euiFilterButton-hasActiveFilters')
    );
  });

  it('renders user actions stats correctly', async () => {
    appMockRender.render(
      <FilterActivity
        type="all"
        onFilterChange={onFilterActivityChange}
        userActionsStats={userActionsStats}
      />
    );

    expect(
      await screen.findByLabelText(`${userActionsStats.total} active filters`)
    ).toBeInTheDocument();
    expect(
      await screen.findByLabelText(`${userActionsStats.totalComments} available filters`)
    ).toBeInTheDocument();
    expect(
      await screen.findByLabelText(`${userActionsStats.totalOtherActions} available filters`)
    ).toBeInTheDocument();
  });

  it('onChange is called with user filter type', async () => {
    appMockRender.render(<FilterActivity type="all" onFilterChange={onFilterActivityChange} />);

    const commentsFilter = await screen.findByTestId(
      'user-actions-filter-activity-button-comments'
    );

    userEvent.click(commentsFilter);

    await waitFor(() => expect(onFilterActivityChange).toHaveBeenCalledWith('user'));
  });

  it('onChange is called with action filter type', async () => {
    appMockRender.render(<FilterActivity type="user" onFilterChange={onFilterActivityChange} />);

    const actionsFilter = await screen.findByTestId('user-actions-filter-activity-button-history');

    userEvent.click(actionsFilter);

    await waitFor(() => expect(onFilterActivityChange).toHaveBeenCalledWith('action'));
    expect(
      (await screen.findByTestId('user-actions-filter-activity-button-history')).classList.contains(
        'euiFilterButton-hasActiveFilters'
      )
    );
  });

  it('onChange is called with all filter type', async () => {
    appMockRender.render(<FilterActivity type="action" onFilterChange={onFilterActivityChange} />);

    const actionsFilter = await screen.findByTestId('user-actions-filter-activity-button-all');

    userEvent.click(actionsFilter);

    await waitFor(() => expect(onFilterActivityChange).toHaveBeenCalledWith('all'));
    expect(
      (await screen.findByTestId('user-actions-filter-activity-button-all')).classList.contains(
        'euiFilterButton-hasActiveFilters'
      )
    );
  });
});
