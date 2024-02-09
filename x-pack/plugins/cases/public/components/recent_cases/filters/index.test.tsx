/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { AppMockRenderer } from '../../../common/mock';
import { createAppMockRenderer } from '../../../common/mock';
import { waitFor, fireEvent, screen } from '@testing-library/react';
import { RecentCasesFilters, caseFilterOptions } from '.';
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

  it('renders', async () => {
    appMockRender.render(<RecentCasesFilters {...props} />);
    expect(await screen.findByTestId('recent-cases-filter')).toBeTruthy();
  });

  it('renders loading state correctly', async () => {
    appMockRender.render(<RecentCasesFilters {...props} isLoading={true} />);
    expect(await screen.findByLabelText('Loading')).toBeTruthy();
    expect(await screen.findByRole('progressbar')).toBeTruthy();
  });

  it('renders disabled  state correctly', async () => {
    appMockRender.render(<RecentCasesFilters {...props} hasCurrentUserInfo={false} />);
    expect(await screen.findByTestId('recent-cases-filter')).toHaveAttribute('disabled');
  });

  it('selects the correct value when changed to reported by me', async () => {
    appMockRender.render(<RecentCasesFilters {...props} />);

    const recentCasesFilter = await screen.findByTestId('recent-cases-filter');

    expect(recentCasesFilter).toBeInTheDocument();

    expect(await screen.findByText(caseFilterOptions[1].label)).toBeInTheDocument();

    fireEvent.change(recentCasesFilter, { target: { value: 'myRecentlyReported' } });

    await waitFor(() => {
      expect(setFilterBy).toHaveBeenCalledWith('myRecentlyReported');
    });
  });

  it('selects the correct value when changed assigned to me', async () => {
    appMockRender.render(<RecentCasesFilters {...props} />);

    const recentCasesFilter = await screen.findByTestId('recent-cases-filter');

    expect(recentCasesFilter).toBeInTheDocument();

    expect(await screen.findByText(caseFilterOptions[2].label)).toBeInTheDocument();

    fireEvent.change(recentCasesFilter, { target: { value: 'myRecentlyAssigned' } });

    await waitFor(() => {
      expect(setFilterBy).toHaveBeenCalledWith('myRecentlyAssigned');
    });
  });
});
