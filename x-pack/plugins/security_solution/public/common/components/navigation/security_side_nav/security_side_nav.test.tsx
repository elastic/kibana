/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { BehaviorSubject } from 'rxjs';
import { SecurityPageName } from '../../../../app/types';
import { TestProviders } from '../../../mock';
import { BOTTOM_BAR_HEIGHT, EUI_HEADER_HEIGHT, SecuritySideNav } from './security_side_nav';
import type { SolutionSideNavProps } from '@kbn/security-solution-side-nav';
import type { NavLinkItem } from '../types';
import { track } from '../../../lib/telemetry';
import { useKibana } from '../../../lib/kibana';

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

const mockSolutionSideNav = jest.fn((_: SolutionSideNavProps) => <></>);
jest.mock('@kbn/security-solution-side-nav', () => ({
  SolutionSideNav: (props: SolutionSideNavProps) => mockSolutionSideNav(props),
}));
jest.mock('../../../lib/kibana');

const mockUseRouteSpy = jest.fn(() => [{ pageName: SecurityPageName.alerts }]);
jest.mock('../../../utils/route/use_route_spy', () => ({
  useRouteSpy: () => mockUseRouteSpy(),
}));

jest.mock('../../../links', () => ({
  getAncestorLinksInfo: (id: string) => [{ id }],
}));

const mockUseAppNavLinks = jest.fn();
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
    mockUseAppNavLinks.mockReturnValue([alertsNavLink, manageNavLink]);
    useKibana().services.chrome.hasHeaderBanner$ = jest.fn(() =>
      new BehaviorSubject(false).asObservable()
    );
  });

  it('should render main items', () => {
    mockUseAppNavLinks.mockReturnValue([alertsNavLink]);
    renderNav();
    expect(mockSolutionSideNav).toHaveBeenCalledWith({
      selectedId: SecurityPageName.alerts,
      items: [
        {
          id: SecurityPageName.alerts,
          label: 'alerts',
          href: '/alerts',
        },
      ],
      footerItems: [],
      tracker: track,
    });
  });

  it('should render the loader if items are still empty', () => {
    mockUseAppNavLinks.mockReturnValue([]);
    const result = renderNav();
    expect(result.getByTestId('sideNavLoader')).toBeInTheDocument();
    expect(mockSolutionSideNav).not.toHaveBeenCalled();
  });

  it('should render with selected id', () => {
    mockUseRouteSpy.mockReturnValueOnce([{ pageName: SecurityPageName.administration }]);
    renderNav();
    expect(mockSolutionSideNav).toHaveBeenCalledWith(
      expect.objectContaining({
        selectedId: SecurityPageName.administration,
      })
    );
  });

  it('should render footer items', () => {
    mockUseAppNavLinks.mockReturnValue([manageNavLink]);
    renderNav();
    expect(mockSolutionSideNav).toHaveBeenCalledWith(
      expect.objectContaining({
        items: [],
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
    mockUseAppNavLinks.mockReturnValue([{ ...alertsNavLink, disabled: true }, manageNavLink]);
    renderNav();
    expect(mockSolutionSideNav).toHaveBeenCalledWith(
      expect.objectContaining({
        items: [],
        footerItems: [
          expect.objectContaining({
            id: SecurityPageName.administration,
          }),
        ],
      })
    );
  });

  it('should render custom item', () => {
    mockUseAppNavLinks.mockReturnValue([{ id: SecurityPageName.landing, title: 'get started' }]);
    renderNav();
    expect(mockSolutionSideNav).toHaveBeenCalledWith(
      expect.objectContaining({
        items: [],
        footerItems: [
          expect.objectContaining({
            id: SecurityPageName.landing,
            label: 'GET STARTED',
            labelSize: 'xs',
            iconType: 'launch',
            appendSeparator: true,
          }),
        ],
      })
    );
  });

  describe('panelTopOffset', () => {
    it('should render with top offset when chrome header banner is present', () => {
      useKibana().services.chrome.hasHeaderBanner$ = jest.fn(() =>
        new BehaviorSubject(true).asObservable()
      );
      renderNav();
      expect(mockSolutionSideNav).toHaveBeenCalledWith(
        expect.objectContaining({
          panelTopOffset: `calc(${EUI_HEADER_HEIGHT} + 32px)`,
        })
      );
    });

    it('should render without top offset when chrome header banner is not present', () => {
      renderNav();
      expect(mockSolutionSideNav).toHaveBeenCalledWith(
        expect.objectContaining({
          panelTopOffset: undefined,
        })
      );
    });
  });

  describe('panelBottomOffset', () => {
    it('should render with bottom offset when timeline bar visible', () => {
      mockUseIsPolicySettingsBarVisible.mockReturnValue(false);
      mockUseShowTimeline.mockReturnValue([true]);
      renderNav();
      expect(mockSolutionSideNav).toHaveBeenCalledWith(
        expect.objectContaining({
          panelBottomOffset: BOTTOM_BAR_HEIGHT,
        })
      );
    });

    it('should render with bottom offset when policy settings bar visible', () => {
      mockUseShowTimeline.mockReturnValue([false]);
      mockUseIsPolicySettingsBarVisible.mockReturnValue(true);
      renderNav();
      expect(mockSolutionSideNav).toHaveBeenCalledWith(
        expect.objectContaining({
          panelBottomOffset: BOTTOM_BAR_HEIGHT,
        })
      );
    });

    it('should not render with bottom offset when not needed', () => {
      mockUseShowTimeline.mockReturnValue([false]);
      mockUseIsPolicySettingsBarVisible.mockReturnValue(false);
      renderNav();
      expect(mockSolutionSideNav).toHaveBeenCalledWith(
        expect.objectContaining({
          panelBottomOffset: undefined,
        })
      );
    });
  });
});
