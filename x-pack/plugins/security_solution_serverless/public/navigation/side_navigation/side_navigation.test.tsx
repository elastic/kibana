/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { SecuritySideNavigation } from './side_navigation';
import { useSideNavItems, useSideNavSelectedId } from './use_side_nav_items';
import { SecurityPageName } from '@kbn/security-solution-plugin/common';
import { ServicesWrapper } from '../../common/__mocks__/services.mock';

jest.mock('./use_side_nav_items');

const mockUseSideNavItems = useSideNavItems as jest.Mock;
const mockUseSideNavSelectedId = useSideNavSelectedId as jest.Mock;

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

mockUseSideNavItems.mockReturnValue(sideNavItems);
mockUseSideNavSelectedId.mockReturnValue(SecurityPageName.alerts);

describe('SecuritySideNavigation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render loading when not items received', () => {
    mockUseSideNavItems.mockReturnValueOnce([]);
    const component = render(<SecuritySideNavigation />, { wrapper: ServicesWrapper });
    expect(component.queryByTestId('sideNavLoader')).toBeInTheDocument();
  });

  it('should not render loading when items received', () => {
    const component = render(<SecuritySideNavigation />, { wrapper: ServicesWrapper });
    expect(component.queryByTestId('sideNavLoader')).not.toBeInTheDocument();
  });

  it('should render the SideNav when items received', () => {
    const component = render(<SecuritySideNavigation />, { wrapper: ServicesWrapper });
    expect(component.queryByTestId('solutionSideNav')).toBeInTheDocument();
  });

  it('should pass item props to the SolutionSideNav component', () => {
    render(<SecuritySideNavigation />, { wrapper: ServicesWrapper });

    expect(mockSolutionSideNav).toHaveBeenCalledWith(
      expect.objectContaining({
        items: sideNavItems,
      })
    );
  });

  it('should selectedId the SolutionSideNav component', () => {
    render(<SecuritySideNavigation />, { wrapper: ServicesWrapper });

    expect(mockSolutionSideNav).toHaveBeenCalledWith(
      expect.objectContaining({
        selectedId: SecurityPageName.alerts,
      })
    );
  });
});
