/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { AppMockRenderer } from '../../../common/mock';
import { createAppMockRenderer } from '../../../common/mock';
import userEvent from '@testing-library/user-event';
import { waitFor } from '@testing-library/dom';
import { waitForEuiPopoverOpen } from '@elastic/eui/lib/test/rtl';
import { RecentCasesFilters } from '.';
import type { FilterMode } from '../types';

describe('Severity form field', () => {
  const setFilterBy = jest.fn();
  const filterBy: FilterMode = 'recentlyCreated';
  let appMockRender: AppMockRenderer;
  const props = {
    filterBy,
    setFilterBy,
    hasCurrentUserInfo: true,
    isLoading: false,
  };

  beforeEach(() => {
    appMockRender = createAppMockRenderer();
  });

  it('renders', () => {
    const result = appMockRender.render(<RecentCasesFilters {...props} />);
    expect(result.getByTestId('recent-cases-filter')).toBeTruthy();
  });

  it('renders loading state correctly', () => {
    const result = appMockRender.render(<RecentCasesFilters {...props} isLoading={true} />);
    expect(result.getByLabelText('Loading')).toBeTruthy();
    expect(result.getByRole('progressbar')).toBeTruthy();
  });

  it('renders disabled  state correctly', () => {
    const result = appMockRender.render(
      <RecentCasesFilters {...props} hasCurrentUserInfo={false} />
    );
    expect(result.getByTestId('recent-cases-filter')).toHaveAttribute('disabled');
  });

  it('selects the correct value when changed to reported by me', async () => {
    const result = appMockRender.render(<RecentCasesFilters {...props} />);

    userEvent.click(result.getByTestId('recent-cases-filter'));

    await waitForEuiPopoverOpen();

    expect(result.getByTestId('recent-cases-filter-myRecentlyReported')).toBeTruthy();

    userEvent.click(result.getByTestId('recent-cases-filter-myRecentlyReported'));

    await waitFor(() => {
      expect(setFilterBy).toHaveBeenCalledWith('myRecentlyReported');
    });
  });

  it('selects the correct value when changed assigned to me', async () => {
    const result = appMockRender.render(<RecentCasesFilters {...props} />);

    userEvent.click(result.getByTestId('recent-cases-filter'));

    await waitForEuiPopoverOpen();

    userEvent.click(result.getByTestId('recent-cases-filter-myRecentlyAssigned'));

    await waitFor(() => {
      expect(setFilterBy).toHaveBeenCalledWith('myRecentlyAssigned');
    });
  });
});
