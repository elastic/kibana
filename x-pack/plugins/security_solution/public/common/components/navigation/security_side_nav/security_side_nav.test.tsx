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
import { SolutionGroupedNavProps } from '../solution_grouped_nav/solution_grouped_nav';
import { NavLinkItem } from '../types';

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

const mockedUseCanSeeHostIsolationExceptionsMenu = jest.fn();
jest.mock('../../../../management/pages/host_isolation_exceptions/view/hooks', () => ({
  useCanSeeHostIsolationExceptionsMenu: () => mockedUseCanSeeHostIsolationExceptionsMenu(),
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

  it('should render hostIsolationExceptionsLink when useCanSeeHostIsolationExceptionsMenu is true', () => {
    mockedUseCanSeeHostIsolationExceptionsMenu.mockReturnValue(true);
    const hostIsolationExceptionsLink = {
      id: SecurityPageName.hostIsolationExceptions,
      title: 'test hostIsolationExceptions',
      description: 'test description hostIsolationExceptions',
    };

    mockUseAppNavLinks.mockReturnValueOnce([
      {
        ...manageNavLink,
        links: [hostIsolationExceptionsLink],
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
            items: [
              {
                id: hostIsolationExceptionsLink.id,
                label: hostIsolationExceptionsLink.title,
                description: hostIsolationExceptionsLink.description,
                href: '/host_isolation_exceptions',
              },
            ],
          },
        ],
      })
    );
  });

  it('should not render hostIsolationExceptionsLink when useCanSeeHostIsolationExceptionsMenu is false', () => {
    mockedUseCanSeeHostIsolationExceptionsMenu.mockReturnValue(false);
    const hostIsolationExceptionsLink = {
      id: SecurityPageName.hostIsolationExceptions,
      title: 'test hostIsolationExceptions',
      description: 'test description hostIsolationExceptions',
    };

    mockUseAppNavLinks.mockReturnValueOnce([
      {
        ...manageNavLink,
        links: [hostIsolationExceptionsLink],
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
});
