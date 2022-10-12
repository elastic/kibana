/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import userEvent from '@testing-library/user-event';
import { StubBrowserStorage } from '@kbn/test-jest-helpers';
import { screen } from '@testing-library/react';
import { render } from '../../../lib/helper/rtl_helpers';
import { ZipUrlDeprecation, ZIP_URL_DEPRECATION_SESSION_STORAGE_KEY } from '.';
import * as observabilityPublic from '@kbn/observability-plugin/public';

export const mockStorage = new StubBrowserStorage();
jest.mock('@kbn/observability-plugin/public');

describe('ZipUrlDeprecation', () => {
  const { FETCH_STATUS } = observabilityPublic;
  it('shows deprecation notice when hasZipUrlMonitors is true', () => {
    jest.spyOn(observabilityPublic, 'useFetcher').mockReturnValue({
      status: FETCH_STATUS.SUCCESS,
      data: { hasZipUrlMonitors: true },
      refetch: () => null,
      loading: false,
    });

    render(<ZipUrlDeprecation />);
    expect(screen.getByText('Deprecation notice')).toBeInTheDocument();
  });

  it('does not show deprecation notice when hasZipUrlMonitors is false', () => {
    jest.spyOn(observabilityPublic, 'useFetcher').mockReturnValue({
      status: FETCH_STATUS.SUCCESS,
      data: { hasZipUrlMonitors: false },
      refetch: () => null,
      loading: false,
    });

    render(<ZipUrlDeprecation />);
    expect(screen.queryByText('Deprecation notice')).not.toBeInTheDocument();
  });

  it('dismisses notification', () => {
    jest.spyOn(observabilityPublic, 'useFetcher').mockReturnValue({
      status: FETCH_STATUS.SUCCESS,
      data: { hasZipUrlMonitors: true },
      refetch: () => null,
      loading: false,
    });

    render(<ZipUrlDeprecation />);
    expect(screen.getByText('Deprecation notice')).toBeInTheDocument();
    userEvent.click(screen.getByText('Dismiss'));
    expect(screen.queryByText('Deprecation notice')).not.toBeInTheDocument();
  });

  it('does not show notification when session storage key is true', () => {
    jest.spyOn(observabilityPublic, 'useFetcher').mockReturnValue({
      status: FETCH_STATUS.SUCCESS,
      data: { hasZipUrlMonitors: true },
      refetch: () => null,
      loading: false,
    });
    mockStorage.setItem(ZIP_URL_DEPRECATION_SESSION_STORAGE_KEY, 'true');

    render(<ZipUrlDeprecation />);
    expect(screen.queryByText('Deprecation notice')).not.toBeInTheDocument();
  });
});
