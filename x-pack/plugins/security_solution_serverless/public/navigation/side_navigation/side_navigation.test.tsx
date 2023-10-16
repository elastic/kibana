/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { APP_UI_ID } from '@kbn/security-solution-plugin/common';
import { SecurityPageName } from '@kbn/security-solution-navigation';
import { SecuritySideNavigation } from './side_navigation';
import { useSideNavItems } from './use_side_nav_items';
import type { ChromeProjectNavigationNode } from '@kbn/core-chrome-browser';
import { ExternalPageName } from '../links/constants';
import { I18nProvider } from '@kbn/i18n-react';

jest.mock('./use_side_nav_items');
jest.mock('../../common/services');

const mockUseSideNavItems = useSideNavItems as jest.Mock;

const mockSolutionSideNav = jest.fn((_props: unknown) => <div data-test-subj="solutionSideNav" />);
jest.mock('@kbn/security-solution-side-nav', () => ({
  ...jest.requireActual('@kbn/security-solution-side-nav'),
  SolutionSideNav: (props: unknown) => mockSolutionSideNav(props),
}));

const mockSideNavigationFooter = jest.fn((_props: unknown) => (
  <div data-test-subj="solutionSideNavFooter" />
));
jest.mock('./side_navigation_footer', () => ({
  ...jest.requireActual('./side_navigation_footer'),
  SideNavigationFooter: (props: unknown) => mockSideNavigationFooter(props),
}));

const sideNavItems = [
  {
    id: SecurityPageName.dashboards,
    label: 'Dashboards',
    href: '/dashboards',
    position: 'top',
    onClick: jest.fn(),
  },
  {
    id: SecurityPageName.alerts,
    label: 'Alerts',
    href: '/alerts',
    position: 'top',
    onClick: jest.fn(),
  },
  {
    id: SecurityPageName.administration,
    label: 'Manage',
    href: '/administration',
    position: 'bottom',
    onClick: jest.fn(),
  },
];

describe('SecuritySideNavigation', () => {
  beforeEach(() => {
    mockUseSideNavItems.mockReturnValue(sideNavItems);
    jest.clearAllMocks();
  });

  it('should render loading when not items received', () => {
    mockUseSideNavItems.mockReturnValue([]);
    const component = render(<SecuritySideNavigation activeNodes={[]} />, {
      wrapper: I18nProvider,
    });
    expect(component.queryByTestId('sideNavLoader')).toBeInTheDocument();
  });

  it('should not render loading when items received', () => {
    const component = render(<SecuritySideNavigation activeNodes={[]} />, {
      wrapper: I18nProvider,
    });
    expect(component.queryByTestId('sideNavLoader')).not.toBeInTheDocument();
  });

  it('should render the SideNav when items received', () => {
    const component = render(<SecuritySideNavigation activeNodes={[]} />, {
      wrapper: I18nProvider,
    });
    expect(component.queryByTestId('solutionSideNav')).toBeInTheDocument();
  });

  it('should render the SideNav footer when items received', () => {
    const component = render(<SecuritySideNavigation activeNodes={[]} />, {
      wrapper: I18nProvider,
    });
    expect(component.queryByTestId('solutionSideNavFooter')).toBeInTheDocument();
  });

  it('should pass only top items to the SolutionSideNav component', () => {
    render(<SecuritySideNavigation activeNodes={[]} />, { wrapper: I18nProvider });

    expect(mockSolutionSideNav).toHaveBeenCalledWith(
      expect.objectContaining({
        items: [
          expect.objectContaining({ id: SecurityPageName.dashboards }),
          expect.objectContaining({ id: SecurityPageName.alerts }),
        ],
      })
    );
  });

  it('should pass only bottom items to the SideNavigationFooter component', () => {
    render(<SecuritySideNavigation activeNodes={[]} />, { wrapper: I18nProvider });

    expect(mockSideNavigationFooter).toHaveBeenCalledWith(
      expect.objectContaining({
        items: [expect.objectContaining({ id: SecurityPageName.administration })],
      })
    );
  });

  it('should set empty selectedId', () => {
    render(<SecuritySideNavigation activeNodes={[]} />, { wrapper: I18nProvider });

    expect(mockSolutionSideNav).toHaveBeenCalledWith(
      expect.objectContaining({
        selectedId: '',
      })
    );
    expect(mockSideNavigationFooter).toHaveBeenCalledWith(
      expect.objectContaining({
        selectedId: '',
      })
    );
  });

  it('should set root external selectedId', () => {
    const activeNodes = [[{ id: 'dev_tools' }]] as ChromeProjectNavigationNode[][];
    render(<SecuritySideNavigation activeNodes={activeNodes} />, { wrapper: I18nProvider });

    expect(mockSolutionSideNav).toHaveBeenCalledWith(
      expect.objectContaining({
        selectedId: ExternalPageName.devTools,
      })
    );
    expect(mockSideNavigationFooter).toHaveBeenCalledWith(
      expect.objectContaining({
        selectedId: ExternalPageName.devTools,
      })
    );
  });

  it('should set external page selectedId', () => {
    const activeNodes = [[{ id: `ml:overview` }]] as ChromeProjectNavigationNode[][];
    render(<SecuritySideNavigation activeNodes={activeNodes} />, { wrapper: I18nProvider });

    expect(mockSolutionSideNav).toHaveBeenCalledWith(
      expect.objectContaining({
        selectedId: ExternalPageName.mlOverview,
      })
    );
    expect(mockSideNavigationFooter).toHaveBeenCalledWith(
      expect.objectContaining({
        selectedId: ExternalPageName.mlOverview,
      })
    );
  });

  it('should set internal selectedId', () => {
    const activeNodes = [
      [{ id: `${APP_UI_ID}:${SecurityPageName.alerts}` }],
    ] as ChromeProjectNavigationNode[][];
    render(<SecuritySideNavigation activeNodes={activeNodes} />, { wrapper: I18nProvider });

    expect(mockSolutionSideNav).toHaveBeenCalledWith(
      expect.objectContaining({
        selectedId: SecurityPageName.alerts,
      })
    );
    expect(mockSideNavigationFooter).toHaveBeenCalledWith(
      expect.objectContaining({
        selectedId: SecurityPageName.alerts,
      })
    );
  });
});
