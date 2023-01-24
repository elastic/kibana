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
import userEvent from '@testing-library/user-event';

import { UserActionsActivityBar } from '.';
import type { Params } from '.';

describe('UserActionsActivityBar ', () => {
  const onUserActionsActivityChanged = jest.fn();

  let appMockRender: AppMockRenderer;

  const params: Params = {
    type: 'all',
    sortOrder: 'asc',
  };

  beforeEach(() => {
    appMockRender = createAppMockRenderer();
    jest.clearAllMocks();
  });

  it('renders correctly', () => {
    const res = appMockRender.render(
      <UserActionsActivityBar
        onUserActionsActivityChanged={onUserActionsActivityChanged}
        params={params}
      />
    );

    expect(res.getByTestId('user-actions-activity-bar')).toBeInTheDocument();
  });

  it('should change filter correctly', async () => {
    const res = appMockRender.render(
      <UserActionsActivityBar
        onUserActionsActivityChanged={onUserActionsActivityChanged}
        params={params}
      />
    );

    const commentsFilter = res.getByTestId('user-actions-filter-activity-button-comments');

    userEvent.click(commentsFilter);

    await waitFor(() =>
      expect(onUserActionsActivityChanged).toHaveBeenCalledWith({ ...params, type: 'user' })
    );
    expect(
      res
        .getByTestId('user-actions-filter-activity-button-comments')
        .classList.contains('euiFilterButton-hasActiveFilters')
    );
  });

  it('should change sort order correctly', async () => {
    const res = appMockRender.render(
      <UserActionsActivityBar
        onUserActionsActivityChanged={onUserActionsActivityChanged}
        params={params}
      />
    );

    const sortSelect = res.getByTestId('user-actions-sort-select');

    expect(sortSelect).toBeInTheDocument();

    fireEvent.change(sortSelect, { target: { value: 'desc' } });

    await waitFor(() =>
      expect(onUserActionsActivityChanged).toHaveBeenCalledWith({ ...params, sortOrder: 'desc' })
    );
  });

  it('should not change filter when sort order changed', async () => {
    const res = appMockRender.render(
      <UserActionsActivityBar
        onUserActionsActivityChanged={onUserActionsActivityChanged}
        params={params}
      />
    );

    const sortSelect = res.getByTestId('user-actions-sort-select');

    expect(sortSelect).toBeInTheDocument();

    fireEvent.change(sortSelect, { target: { value: 'desc' } });

    await waitFor(() =>
      expect(onUserActionsActivityChanged).toHaveBeenCalledWith({ ...params, sortOrder: 'desc' })
    );
    
    expect(
      res
        .getByTestId('user-actions-filter-activity-button-all')
        .classList.contains('euiFilterButton-hasActiveFilters')
    );
  });

  it('should not change sort order when filter changed', async () => {
    const res = appMockRender.render(
      <UserActionsActivityBar
        onUserActionsActivityChanged={onUserActionsActivityChanged}
        params={params}
      />
    );

    const commentsFilter = res.getByTestId('user-actions-filter-activity-button-actions');

    userEvent.click(commentsFilter);

    await waitFor(() =>
      expect(onUserActionsActivityChanged).toHaveBeenCalledWith({
        type: 'action',
        sortOrder: 'asc',
      })
    );
  });
});
