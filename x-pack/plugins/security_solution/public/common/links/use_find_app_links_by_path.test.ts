/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';
import { APP_PATH, SecurityPageName } from '../../../common';
import { useFindAppLinksByPath } from './use_find_app_links_by_path';

const mockedGetAppUrl = jest
  .fn()
  .mockImplementation(({ deepLinkId }) => `${APP_PATH}/${deepLinkId}`);
const mockedUseLocation = jest.fn().mockReturnValue({ pathname: '/' });

jest.mock('../lib/kibana', () => ({
  useAppUrl: () => ({
    getAppUrl: mockedGetAppUrl,
  }),
  useBasePath: () => '',
}));

jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return {
    ...actual,
    useLocation: () => mockedUseLocation(),
  };
});

describe('useFindAppLinksByPath', () => {
  it('returns null when navLinks is undefined', () => {
    const { result } = renderHook(() => useFindAppLinksByPath(undefined));
    expect(result.current).toBe(null);
  });
  it('returns null when navLinks is empty', () => {
    const { result } = renderHook(() => useFindAppLinksByPath([]));
    expect(result.current).toBe(null);
  });

  it('returns null when navLinks is not empty but does not match the current pathname', () => {
    const { result } = renderHook(() =>
      useFindAppLinksByPath([{ id: SecurityPageName.hostsAnomalies, title: 'no page' }])
    );
    expect(result.current).toBe(null);
  });

  it('returns nav item when it matches the current pathname', () => {
    const navItem = { id: SecurityPageName.users, title: 'Test User page' };
    mockedUseLocation.mockReturnValue({ pathname: '/users' });
    const { result } = renderHook(() => useFindAppLinksByPath([navItem]));
    expect(result.current).toBe(navItem);
  });

  it('returns nav item when the pathname starts with the nav item url', () => {
    const navItem = { id: SecurityPageName.users, title: 'Test User page' };
    mockedUseLocation.mockReturnValue({ pathname: '/users/events' });
    const { result } = renderHook(() => useFindAppLinksByPath([navItem]));
    expect(result.current).toBe(navItem);
  });

  it('returns leaf nav item when it matches the current pathname', () => {
    const leafNavItem = { id: SecurityPageName.usersEvents, title: 'Test User Events page' };
    const navItem = {
      id: SecurityPageName.users,
      title: 'Test User page',
      links: [leafNavItem],
    };
    mockedUseLocation.mockReturnValue({ pathname: '/users-events' });
    const { result } = renderHook(() => useFindAppLinksByPath([navItem]));
    expect(result.current).toBe(leafNavItem);
  });

  it('should not confuse pages with similar names (users and users-risk)', () => {
    const usersNavItem = { id: SecurityPageName.users, title: 'Test User page' };
    const usersRiskNavItem = { id: SecurityPageName.usersRisk, title: 'Test User Risk page' };

    mockedUseLocation.mockReturnValue({ pathname: '/users-risk' });
    const { result } = renderHook(() => useFindAppLinksByPath([usersNavItem, usersRiskNavItem]));
    expect(result.current).toBe(usersRiskNavItem);
  });
});
