/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import type { Capabilities } from '@kbn/core/public';
import { RedirectRoute } from './app_routes';
import {
  allCasesCapabilities,
  noCasesCapabilities,
  readCasesCapabilities,
} from '../cases_test_utils';
import { CASES_FEATURE_ID, SERVER_APP_ID } from '../../common/constants';

const mockNotFoundPage = jest.fn(() => null);
jest.mock('./404', () => ({
  NotFoundPage: () => mockNotFoundPage(),
}));

const mockRedirect = jest.fn((_: unknown) => null);
jest.mock('react-router-dom', () => ({
  Redirect: (params: unknown) => mockRedirect(params),
}));

describe('RedirectRoute', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('RedirectRoute should redirect to overview page when siem and case privileges are all', () => {
    const mockCapabilities = {
      [SERVER_APP_ID]: { show: true, crud: true },
      [CASES_FEATURE_ID]: allCasesCapabilities(),
    } as unknown as Capabilities;
    render(<RedirectRoute capabilities={mockCapabilities} />);
    expect(mockRedirect).toHaveBeenCalledWith({ to: '/get_started' });
  });

  it('RedirectRoute should redirect to overview page when siem and case privileges are read', () => {
    const mockCapabilities = {
      [SERVER_APP_ID]: { show: true, crud: false },
      [CASES_FEATURE_ID]: readCasesCapabilities(),
    } as unknown as Capabilities;
    render(<RedirectRoute capabilities={mockCapabilities} />);
    expect(mockRedirect).toHaveBeenCalledWith({ to: '/get_started' });
  });

  it('RedirectRoute should redirect to not_found page when siem and case privileges are off', () => {
    const mockCapabilities = {
      [SERVER_APP_ID]: { show: false, crud: false },
      [CASES_FEATURE_ID]: noCasesCapabilities(),
    } as unknown as Capabilities;
    render(<RedirectRoute capabilities={mockCapabilities} />);
    expect(mockRedirect).not.toHaveBeenCalled();
    expect(mockNotFoundPage).toHaveBeenCalled();
  });

  it('RedirectRoute should redirect to overview page when siem privilege is read and case privilege is all', () => {
    const mockCapabilities = {
      [SERVER_APP_ID]: { show: true, crud: false },
      [CASES_FEATURE_ID]: allCasesCapabilities(),
    } as unknown as Capabilities;
    render(<RedirectRoute capabilities={mockCapabilities} />);
    expect(mockRedirect).toHaveBeenCalledWith({ to: '/get_started' });
  });

  it('RedirectRoute should redirect to overview page when siem privilege is read and case privilege is read', () => {
    const mockCapabilities = {
      [SERVER_APP_ID]: { show: true, crud: false },
      [CASES_FEATURE_ID]: allCasesCapabilities(),
    } as unknown as Capabilities;
    render(<RedirectRoute capabilities={mockCapabilities} />);
    expect(mockRedirect).toHaveBeenCalledWith({ to: '/get_started' });
  });

  it('RedirectRoute should redirect to cases page when siem privilege is none and case privilege is read', () => {
    const mockCapabilities = {
      [SERVER_APP_ID]: { show: false, crud: false },
      [CASES_FEATURE_ID]: readCasesCapabilities(),
    } as unknown as Capabilities;
    render(<RedirectRoute capabilities={mockCapabilities} />);
    expect(mockRedirect).toHaveBeenCalledWith({ to: '/cases' });
  });

  it('RedirectRoute should redirect to cases page when siem privilege is none and case privilege is all', () => {
    const mockCapabilities = {
      [SERVER_APP_ID]: { show: false, crud: false },
      [CASES_FEATURE_ID]: allCasesCapabilities(),
    } as unknown as Capabilities;
    render(<RedirectRoute capabilities={mockCapabilities} />);
    expect(mockRedirect).toHaveBeenCalledWith({ to: '/cases' });
  });
});
