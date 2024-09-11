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
import userEvent from '@testing-library/user-event';

import { UserActionsActivityBar } from '.';
import type { UserActivityParams } from './types';

describe('UserActionsActivityBar ', () => {
  const onUserActionsActivityChanged = jest.fn();

  let appMockRender: AppMockRenderer;

  const params: UserActivityParams = {
    type: 'all',
    sortOrder: 'asc',
    page: 1,
    perPage: 10,
  };

  beforeEach(() => {
    appMockRender = createAppMockRenderer();
    jest.clearAllMocks();
  });

  it('renders correctly', () => {
    appMockRender.render(
      <UserActionsActivityBar
        onUserActionsActivityChanged={onUserActionsActivityChanged}
        params={params}
      />
    );

    expect(screen.getByTestId('user-actions-activity-bar')).toBeInTheDocument();
  });

  it('should change filter correctly', async () => {
    appMockRender.render(
      <UserActionsActivityBar
        onUserActionsActivityChanged={onUserActionsActivityChanged}
        params={params}
      />
    );

    const commentsFilter = screen.getByTestId('user-actions-filter-activity-button-comments');

    await userEvent.click(commentsFilter);

    await waitFor(() =>
      expect(onUserActionsActivityChanged).toHaveBeenCalledWith({ ...params, type: 'user' })
    );
    expect(
      screen
        .getByTestId('user-actions-filter-activity-button-comments')
        .classList.contains('euiFilterButton-hasActiveFilters')
    );
  });

  it('should change sort order correctly', async () => {
    appMockRender.render(
      <UserActionsActivityBar
        onUserActionsActivityChanged={onUserActionsActivityChanged}
        params={params}
      />
    );

    const sortSelect = screen.getByTestId('user-actions-sort-select');

    expect(sortSelect).toBeInTheDocument();

    fireEvent.change(sortSelect, { target: { value: 'desc' } });

    await waitFor(() =>
      expect(onUserActionsActivityChanged).toHaveBeenCalledWith({ ...params, sortOrder: 'desc' })
    );
  });

  it('should not change filter when sort order changed', async () => {
    appMockRender.render(
      <UserActionsActivityBar
        onUserActionsActivityChanged={onUserActionsActivityChanged}
        params={params}
      />
    );

    const sortSelect = screen.getByTestId('user-actions-sort-select');

    expect(sortSelect).toBeInTheDocument();

    fireEvent.change(sortSelect, { target: { value: 'desc' } });

    await waitFor(() =>
      expect(onUserActionsActivityChanged).toHaveBeenCalledWith({ ...params, sortOrder: 'desc' })
    );

    expect(
      screen
        .getByTestId('user-actions-filter-activity-button-all')
        .classList.contains('euiFilterButton-hasActiveFilters')
    );
  });

  it('should not change sort order when filter changed', async () => {
    appMockRender.render(
      <UserActionsActivityBar
        onUserActionsActivityChanged={onUserActionsActivityChanged}
        params={params}
      />
    );

    const commentsFilter = screen.getByTestId('user-actions-filter-activity-button-history');

    await userEvent.click(commentsFilter);

    await waitFor(() =>
      expect(onUserActionsActivityChanged).toHaveBeenCalledWith({
        ...params,
        type: 'action',
        sortOrder: 'asc',
      })
    );
  });
});
