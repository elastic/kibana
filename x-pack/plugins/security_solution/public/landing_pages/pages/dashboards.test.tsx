/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent, render } from '@testing-library/react';
import React from 'react';
import { SecurityPageName } from '../../app/types';
import { TestProviders } from '../../common/mock';
import { DashboardsLandingPage } from './dashboards';
import type { NavLinkItem } from '../../common/components/navigation/types';

jest.mock('../../common/utils/route/spy_routes', () => ({ SpyRoute: () => null }));

const OVERVIEW_ITEM_LABEL = 'Overview';
const DETECTION_RESPONSE_ITEM_LABEL = 'Detection & Response';

const defaultAppDashboardsLink: NavLinkItem = {
  id: SecurityPageName.dashboardsLanding,
  title: 'Dashboards',
  links: [
    {
      id: SecurityPageName.overview,
      title: OVERVIEW_ITEM_LABEL,
      description: '',
      icon: 'testIcon1',
    },
    {
      id: SecurityPageName.detectionAndResponse,
      title: DETECTION_RESPONSE_ITEM_LABEL,
      description: '',
      icon: 'testIcon2',
    },
  ],
};

const mockAppManageLink = jest.fn(() => defaultAppDashboardsLink);
jest.mock('../../common/components/navigation/nav_links', () => ({
  useAppRootNavLink: () => mockAppManageLink(),
}));

const dashboardTableItems = [
  {
    id: 'id 1',
    title: 'dashboard title 1',
    description: 'dashboard desc 1',
  },
  {
    id: 'id 2',
    title: 'dashboard title 2',
    description: 'dashboard desc 2',
  },
];
const mockUseSecurityDashboardsTableItems = jest.fn(() => dashboardTableItems);
jest.mock('../../common/containers/dashboards/use_security_dashboards', () => {
  const actual = jest.requireActual('../../common/containers/dashboards/use_security_dashboards');
  return {
    ...actual,
    useSecurityDashboardsTableItems: () => mockUseSecurityDashboardsTableItems(),
  };
});

const renderDashboardLanding = () => render(<DashboardsLandingPage />, { wrapper: TestProviders });

describe('Dashboards landing', () => {
  it('should render items', () => {
    const { queryByText } = renderDashboardLanding();

    expect(queryByText(OVERVIEW_ITEM_LABEL)).toBeInTheDocument();
    expect(queryByText(DETECTION_RESPONSE_ITEM_LABEL)).toBeInTheDocument();
  });

  it('should render items in the same order as defined', () => {
    mockAppManageLink.mockReturnValueOnce({
      ...defaultAppDashboardsLink,
    });
    const { queryAllByTestId } = renderDashboardLanding();

    const renderedItems = queryAllByTestId('LandingImageCard-item');

    expect(renderedItems[0]).toHaveTextContent(OVERVIEW_ITEM_LABEL);
    expect(renderedItems[1]).toHaveTextContent(DETECTION_RESPONSE_ITEM_LABEL);
  });

  it('should not render items if all items filtered', () => {
    mockAppManageLink.mockReturnValueOnce({
      ...defaultAppDashboardsLink,
      links: [],
    });
    const { queryByText } = renderDashboardLanding();

    expect(queryByText(OVERVIEW_ITEM_LABEL)).not.toBeInTheDocument();
    expect(queryByText(DETECTION_RESPONSE_ITEM_LABEL)).not.toBeInTheDocument();
  });

  it('should render dashboards table', () => {
    const result = renderDashboardLanding();

    expect(result.getByTestId('dashboards-table')).toBeInTheDocument();
  });

  it('should render dashboards table rows', () => {
    const result = renderDashboardLanding();

    expect(mockUseSecurityDashboardsTableItems).toHaveBeenCalled();

    expect(result.queryAllByText(dashboardTableItems[0].title).length).toBeGreaterThan(0);
    expect(result.queryAllByText(dashboardTableItems[0].description).length).toBeGreaterThan(0);

    expect(result.queryAllByText(dashboardTableItems[1].title).length).toBeGreaterThan(0);
    expect(result.queryAllByText(dashboardTableItems[1].description).length).toBeGreaterThan(0);
  });

  it('should render dashboards table rows filtered by search term', () => {
    const result = renderDashboardLanding();

    const input = result.getByRole('searchbox');
    fireEvent.change(input, { target: { value: dashboardTableItems[0].title } });

    expect(result.queryAllByText(dashboardTableItems[0].title).length).toBeGreaterThan(0);
    expect(result.queryAllByText(dashboardTableItems[0].description).length).toBeGreaterThan(0);

    expect(result.queryByText(dashboardTableItems[1].title)).not.toBeInTheDocument();
    expect(result.queryByText(dashboardTableItems[1].description)).not.toBeInTheDocument();
  });
});
