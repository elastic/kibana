/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { SecurityPageName } from '../../../../app/types';
import { TestProviders } from '../../../mock';
import { SecuritySideNav } from './security_side_nav';
import type { SolutionGroupedNavProps } from '../solution_grouped_nav/solution_grouped_nav';
import type { NavLinkItem } from '../types';
import { bottomNavOffset } from '../../../lib/helpers';

const manageNavLink: NavLinkItem = {
  id: SecurityPageName.administration,
  title: 'manage',
  description: 'manage description',
  categories: [{ label: 'test category', linkIds: [SecurityPageName.endpoints] }],
  links: [
    {
      id: SecurityPageName.endpoints,
      title: 'title 2',
      description: 'description 2',
      isBeta: true,
    },
  ],
};
const alertsNavLink: NavLinkItem = {
  id: SecurityPageName.alerts,
  title: 'alerts',
  description: 'alerts description',
};

const mockSolutionGroupedNav = jest.fn((_: SolutionGroupedNavProps) => <></>);
jest.mock('../solution_grouped_nav', () => ({
  SolutionGroupedNav: (props: SolutionGroupedNavProps) => mockSolutionGroupedNav(props),
}));
const mockUseRouteSpy = jest.fn(() => [{ pageName: SecurityPageName.alerts }]);
jest.mock('../../../utils/route/use_route_spy', () => ({
  useRouteSpy: () => mockUseRouteSpy(),
}));

jest.mock('../../../links', () => ({
  getAncestorLinksInfo: (id: string) => [{ id }],
}));

const mockUseAppNavLinks = jest.fn((): NavLinkItem[] => [alertsNavLink, manageNavLink]);
jest.mock('../nav_links', () => ({
  useAppNavLinks: () => mockUseAppNavLinks(),
}));
jest.mock('../../links', () => ({
  useGetSecuritySolutionLinkProps:
    () =>
    ({ deepLinkId }: { deepLinkId: SecurityPageName }) => ({
      href: `/${deepLinkId}`,
    }),
}));

const mockUseShowTimeline = jest.fn((): [boolean] => [false]);
jest.mock('../../../utils/timeline/use_show_timeline', () => ({
  useShowTimeline: () => mockUseShowTimeline(),
}));
const mockUseIsPolicySettingsBarVisible = jest.fn((): boolean => false);
jest.mock('../../../../management/pages/policy/view/policy_hooks', () => ({
  useIsPolicySettingsBarVisible: () => mockUseIsPolicySettingsBarVisible(),
}));

const renderNav = () =>
  render(<SecuritySideNav />, {
    wrapper: TestProviders,
  });

describe('SecuritySideNav', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render main items', () => {
    mockUseAppNavLinks.mockReturnValueOnce([alertsNavLink]);
    renderNav();
    expect(mockSolutionGroupedNav).toHaveBeenCalledWith({
      selectedId: SecurityPageName.alerts,
      items: [
        {
          id: SecurityPageName.alerts,
          label: 'alerts',
          href: '/alerts',
        },
      ],
      footerItems: [],
    });
  });

  it('should render the loader if items are still empty', () => {
    mockUseAppNavLinks.mockReturnValueOnce([]);
    const result = renderNav();
    expect(result.getByTestId('sideNavLoader')).toBeInTheDocument();
    expect(mockSolutionGroupedNav).not.toHaveBeenCalled();
  });

  it('should render with selected id', () => {
    mockUseRouteSpy.mockReturnValueOnce([{ pageName: SecurityPageName.administration }]);
    renderNav();
    expect(mockSolutionGroupedNav).toHaveBeenCalledWith(
      expect.objectContaining({
        selectedId: SecurityPageName.administration,
      })
    );
  });

  it('should render footer items', () => {
    mockUseAppNavLinks.mockReturnValueOnce([manageNavLink]);
    renderNav();
    expect(mockSolutionGroupedNav).toHaveBeenCalledWith(
      expect.objectContaining({
        items: [],
        selectedId: SecurityPageName.alerts,
        footerItems: [
          {
            id: SecurityPageName.administration,
            label: 'manage',
            href: '/administration',
            categories: manageNavLink.categories,
            items: [
              {
                id: SecurityPageName.endpoints,
                label: 'title 2',
                description: 'description 2',
                href: '/endpoints',
                isBeta: true,
              },
            ],
          },
        ],
      })
    );
  });

  it('should not render disabled items', () => {
    mockUseAppNavLinks.mockReturnValueOnce([
      { ...alertsNavLink, disabled: true },
      {
        ...manageNavLink,
        links: [
          {
            id: SecurityPageName.endpoints,
            title: 'title 2',
            description: 'description 2',
            disabled: true,
            isBeta: true,
          },
        ],
      },
    ]);
    renderNav();
    expect(mockSolutionGroupedNav).toHaveBeenCalledWith(
      expect.objectContaining({
        items: [],
        selectedId: SecurityPageName.alerts,
        footerItems: [
          {
            id: SecurityPageName.administration,
            label: 'manage',
            href: '/administration',
            categories: manageNavLink.categories,
            items: [],
          },
        ],
      })
    );
  });

  it('should render custom item', () => {
    mockUseAppNavLinks.mockReturnValueOnce([
      { id: SecurityPageName.landing, title: 'get started' },
    ]);
    renderNav();
    expect(mockSolutionGroupedNav).toHaveBeenCalledWith(
      expect.objectContaining({
        items: [],
        selectedId: SecurityPageName.alerts,
        footerItems: [
          {
            id: SecurityPageName.landing,
            render: expect.any(Function),
          },
        ],
      })
    );
  });

  describe('bottom offset', () => {
    it('should render with bottom offset when timeline bar visible', () => {
      mockUseIsPolicySettingsBarVisible.mockReturnValueOnce(false);
      mockUseShowTimeline.mockReturnValueOnce([true]);
      renderNav();
      expect(mockSolutionGroupedNav).toHaveBeenCalledWith(
        expect.objectContaining({
          bottomOffset: bottomNavOffset,
        })
      );
    });

    it('should render with bottom offset when policy settings bar visible', () => {
      mockUseShowTimeline.mockReturnValueOnce([false]);
      mockUseIsPolicySettingsBarVisible.mockReturnValueOnce(true);
      renderNav();
      expect(mockSolutionGroupedNav).toHaveBeenCalledWith(
        expect.objectContaining({
          bottomOffset: bottomNavOffset,
        })
      );
    });

    it('should not render with bottom offset when not needed', () => {
      mockUseShowTimeline.mockReturnValueOnce([false]);
      mockUseIsPolicySettingsBarVisible.mockReturnValueOnce(false);
      renderNav();
      expect(mockSolutionGroupedNav).toHaveBeenCalledWith(
        expect.not.objectContaining({
          bottomOffset: bottomNavOffset,
        })
      );
    });
  });
});
