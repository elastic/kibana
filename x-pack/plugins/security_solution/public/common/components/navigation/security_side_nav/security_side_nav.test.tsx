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
import type { NavigationLink } from '../../../links/types';
import { track } from '../../../lib/telemetry';
import { useKibana } from '../../../lib/kibana';
import { CATEGORIES } from './categories';

const settingsNavLink: NavigationLink = {
  id: SecurityPageName.administration,
  title: 'Settings',
  description: 'Settings description',
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
const alertsNavLink: NavigationLink = {
  id: SecurityPageName.alerts,
  title: 'alerts',
  description: 'alerts description',
};

const mockSolutionSideNav = jest.fn((_: SolutionSideNavProps) => <></>);
jest.mock('@kbn/security-solution-side-nav', () => ({
  ...jest.requireActual('@kbn/security-solution-side-nav'),
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

const mockUseSecurityInternalNavLinks = jest.fn();
jest.mock('../../../links/nav_links', () => ({
  useSecurityInternalNavLinks: () => mockUseSecurityInternalNavLinks(),
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
    mockUseSecurityInternalNavLinks.mockReturnValue([alertsNavLink, settingsNavLink]);
    useKibana().services.chrome.hasHeaderBanner$ = jest.fn(() =>
      new BehaviorSubject(false).asObservable()
    );
  });

  it('should render main items', () => {
    mockUseSecurityInternalNavLinks.mockReturnValue([alertsNavLink]);
    renderNav();
    expect(mockSolutionSideNav).toHaveBeenCalledWith({
      selectedId: SecurityPageName.alerts,
      items: [
        {
          id: SecurityPageName.alerts,
          label: 'alerts',
          href: '/alerts',
          position: 'top',
        },
      ],
      categories: CATEGORIES,
      tracker: track,
    });
  });

  it('should render the loader if items are still empty', () => {
    mockUseSecurityInternalNavLinks.mockReturnValue([]);
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
    mockUseSecurityInternalNavLinks.mockReturnValue([settingsNavLink]);
    renderNav();
    expect(mockSolutionSideNav).toHaveBeenCalledWith(
      expect.objectContaining({
        items: [
          {
            id: SecurityPageName.administration,
            label: 'Settings',
            href: '/administration',
            categories: settingsNavLink.categories,
            position: 'bottom',
            items: [
              {
                id: SecurityPageName.endpoints,
                label: 'title 2',
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
    mockUseSecurityInternalNavLinks.mockReturnValue([
      { ...alertsNavLink, disabled: true },
      settingsNavLink,
    ]);
    renderNav();
    expect(mockSolutionSideNav).toHaveBeenCalledWith(
      expect.objectContaining({
        items: [
          expect.objectContaining({
            id: SecurityPageName.administration,
          }),
        ],
      })
    );
  });

  it('should render get started item', () => {
    mockUseSecurityInternalNavLinks.mockReturnValue([
      { id: SecurityPageName.landing, title: 'Get started', sideNavIcon: 'launch' },
    ]);
    renderNav();
    expect(mockSolutionSideNav).toHaveBeenCalledWith(
      expect.objectContaining({
        items: [
          expect.objectContaining({
            id: SecurityPageName.landing,
            label: 'Get started',
            position: 'bottom',
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
