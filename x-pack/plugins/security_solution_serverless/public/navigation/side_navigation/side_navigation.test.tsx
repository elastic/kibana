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

const sideNavItems = [
  {
    id: SecurityPageName.dashboards,
    label: 'Dashboards',
    href: '/dashboards',
    onClick: jest.fn(),
  },
  {
    id: SecurityPageName.alerts,
    label: 'Alerts',
    href: '/alerts',
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

  it('should pass item props to the SolutionSideNav component', () => {
    render(<SecuritySideNavigation activeNodes={[]} />, { wrapper: I18nProvider });

    expect(mockSolutionSideNav).toHaveBeenCalledWith(
      expect.objectContaining({
        items: sideNavItems,
      })
    );
  });

  it('should have empty selectedId the SolutionSideNav component', () => {
    render(<SecuritySideNavigation activeNodes={[]} />, { wrapper: I18nProvider });

    expect(mockSolutionSideNav).toHaveBeenCalledWith(
      expect.objectContaining({
        selectedId: '',
      })
    );
  });

  it('should have root external selectedId the SolutionSideNav component', () => {
    const activeNodes = [[{ id: 'dev_tools' }]] as ChromeProjectNavigationNode[][];
    render(<SecuritySideNavigation activeNodes={activeNodes} />, { wrapper: I18nProvider });

    expect(mockSolutionSideNav).toHaveBeenCalledWith(
      expect.objectContaining({
        selectedId: ExternalPageName.devTools,
      })
    );
  });

  it('should have external page selectedId the SolutionSideNav component', () => {
    const activeNodes = [[{ id: `ml:overview` }]] as ChromeProjectNavigationNode[][];
    render(<SecuritySideNavigation activeNodes={activeNodes} />, { wrapper: I18nProvider });

    expect(mockSolutionSideNav).toHaveBeenCalledWith(
      expect.objectContaining({
        selectedId: ExternalPageName.mlOverview,
      })
    );
  });

  it('should internal selectedId the SolutionSideNav component', () => {
    const activeNodes = [
      [{ id: `${APP_UI_ID}:${SecurityPageName.alerts}` }],
    ] as ChromeProjectNavigationNode[][];
    render(<SecuritySideNavigation activeNodes={activeNodes} />, { wrapper: I18nProvider });

    expect(mockSolutionSideNav).toHaveBeenCalledWith(
      expect.objectContaining({
        selectedId: SecurityPageName.alerts,
      })
    );
  });
});
