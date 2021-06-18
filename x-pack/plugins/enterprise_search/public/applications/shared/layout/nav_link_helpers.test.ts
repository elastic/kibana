/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockKibanaValues } from '../../__mocks__/kea_logic';

jest.mock('../react_router_helpers', () => ({
  generateReactRouterProps: ({ to }: { to: string }) => ({
    href: `/app/enterprise_search${to}`,
    onClick: () => mockKibanaValues.navigateToUrl(to),
  }),
}));

import { generateNavLink, getNavLinkActive } from './nav_link_helpers';

describe('generateNavLink', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockKibanaValues.history.location.pathname = '/current_page';
  });

  it('generates React Router props & isSelected (active) state for use within an EuiSideNavItem obj', () => {
    const navItem = generateNavLink({ to: '/test' });

    expect(navItem.href).toEqual('/app/enterprise_search/test');

    navItem.onClick({} as any);
    expect(mockKibanaValues.navigateToUrl).toHaveBeenCalledWith('/test');

    expect(navItem.isSelected).toEqual(false);
  });

  describe('getNavLinkActive', () => {
    it('returns true when the current path matches the link path', () => {
      mockKibanaValues.history.location.pathname = '/test';
      const isSelected = getNavLinkActive({ to: '/test' });

      expect(isSelected).toEqual(true);
    });

    describe('isRoot', () => {
      it('returns true if the current path is "/"', () => {
        mockKibanaValues.history.location.pathname = '/';
        const isSelected = getNavLinkActive({ to: '/overview', isRoot: true });

        expect(isSelected).toEqual(true);
      });
    });

    describe('shouldShowActiveForSubroutes', () => {
      it('returns true if the current path is a subroute of the passed path', () => {
        mockKibanaValues.history.location.pathname = '/hello/world';
        const isSelected = getNavLinkActive({ to: '/hello', shouldShowActiveForSubroutes: true });

        expect(isSelected).toEqual(true);
      });

      it('returns false if not', () => {
        mockKibanaValues.history.location.pathname = '/hello/world';
        const isSelected = getNavLinkActive({ to: '/hello' });

        expect(isSelected).toEqual(false);
      });
    });
  });
});
