/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { SecuritySideNavigation } from './side_navigation';
import { useSideNavItems, useSideNavSelectedId } from '../../hooks/use_side_nav_items';
import { SecurityPageName } from '@kbn/security-solution-plugin/common';
import { KibanaServicesProvider } from '../../services.mock';

jest.mock('../../hooks/use_side_nav_items');
const mockUseSideNavItems = useSideNavItems as jest.Mock;
const mockUseSideNavSelectedId = useSideNavSelectedId as jest.Mock;

const mockSolutionSideNav = jest.fn((_props: unknown) => <div data-test-subj="solutionSideNav" />);
jest.mock('@kbn/security-solution-side-nav', () => ({
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
];
const sideNavFooterItems = [
  {
    id: SecurityPageName.administration,
    label: 'Manage',
    href: '/administration',
    onClick: jest.fn(),
  },
];

mockUseSideNavItems.mockReturnValue(sideNavItems);
mockUseSideNavSelectedId.mockReturnValue(SecurityPageName.alerts);

describe('SecuritySideNavigation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render loading when not items received', () => {
    mockUseSideNavItems.mockReturnValueOnce([]);
    const component = render(<SecuritySideNavigation />, { wrapper: KibanaServicesProvider });
    expect(component.queryByTestId('sideNavLoader')).toBeInTheDocument();
  });

  it('should not render loading when items received', () => {
    const component = render(<SecuritySideNavigation />, { wrapper: KibanaServicesProvider });
    expect(component.queryByTestId('sideNavLoader')).not.toBeInTheDocument();
  });

  it('should render the SideNav when items received', () => {
    const component = render(<SecuritySideNavigation />, { wrapper: KibanaServicesProvider });
    expect(component.queryByTestId('solutionSideNav')).toBeInTheDocument();
  });

  it('should pass item props to the SolutionSideNav component', () => {
    render(<SecuritySideNavigation />, { wrapper: KibanaServicesProvider });

    expect(mockSolutionSideNav).toHaveBeenCalledWith(
      expect.objectContaining({
        items: sideNavItems,
      })
    );
  });

  it('should pass footerItems props to the SolutionSideNav component', () => {
    mockUseSideNavItems.mockReturnValueOnce(sideNavFooterItems);
    render(<SecuritySideNavigation />, { wrapper: KibanaServicesProvider });

    expect(mockSolutionSideNav).toHaveBeenCalledWith(
      expect.objectContaining({
        footerItems: sideNavFooterItems,
      })
    );
  });

  it('should selectedId the SolutionSideNav component', () => {
    render(<SecuritySideNavigation />, { wrapper: KibanaServicesProvider });

    expect(mockSolutionSideNav).toHaveBeenCalledWith(
      expect.objectContaining({
        selectedId: SecurityPageName.alerts,
      })
    );
  });
});
