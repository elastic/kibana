/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import React from 'react';
import { SecurityPageName } from '../../app/types';
import { TestProviders } from '../../common/mock';
import { DashboardsLandingPage } from './dashboards';
import type { NavLinkItem } from '../../common/components/navigation/types';
import { useCapabilities } from '../../common/lib/kibana';

jest.mock('../../common/lib/kibana');
jest.mock('../../common/utils/route/spy_routes', () => ({ SpyRoute: () => null }));
jest.mock('../../common/components/dashboards/dashboards_table', () => ({
  DashboardsTable: () => <span data-test-subj="dashboardsTable" />,
}));

const DEFAULT_DASHBOARD_CAPABILITIES = { show: true, createNew: true };
const mockUseCapabilities = useCapabilities as jest.Mock;
mockUseCapabilities.mockReturnValue(DEFAULT_DASHBOARD_CAPABILITIES);

const OVERVIEW_ITEM_LABEL = 'Overview';
const DETECTION_RESPONSE_ITEM_LABEL = 'Detection & Response';

const APP_DASHBOARD_LINKS: NavLinkItem = {
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
const URL = '/path/to/dashboards';

const mockAppManageLink = jest.fn(() => APP_DASHBOARD_LINKS);
jest.mock('../../common/components/navigation/nav_links', () => ({
  useAppRootNavLink: () => mockAppManageLink(),
}));

const CREATE_DASHBOARD_LINK = { isLoading: false, url: URL };
const mockUseCreateSecurityDashboard = jest.fn(() => CREATE_DASHBOARD_LINK);
jest.mock('../../common/containers/dashboards/use_create_security_dashboard_link', () => {
  const actual = jest.requireActual(
    '../../common/containers/dashboards/use_create_security_dashboard_link'
  );
  return {
    ...actual,
    useCreateSecurityDashboardLink: () => mockUseCreateSecurityDashboard(),
  };
});

const renderDashboardLanding = () => render(<DashboardsLandingPage />, { wrapper: TestProviders });

describe('Dashboards landing', () => {
  describe('Dashboards default links', () => {
    it('should render items', () => {
      const { queryByText } = renderDashboardLanding();

      expect(queryByText(OVERVIEW_ITEM_LABEL)).toBeInTheDocument();
      expect(queryByText(DETECTION_RESPONSE_ITEM_LABEL)).toBeInTheDocument();
    });

    it('should render items in the same order as defined', () => {
      mockAppManageLink.mockReturnValueOnce({
        ...APP_DASHBOARD_LINKS,
      });
      const { queryAllByTestId } = renderDashboardLanding();

      const renderedItems = queryAllByTestId('LandingImageCard-item');

      expect(renderedItems[0]).toHaveTextContent(OVERVIEW_ITEM_LABEL);
      expect(renderedItems[1]).toHaveTextContent(DETECTION_RESPONSE_ITEM_LABEL);
    });

    it('should not render items if all items filtered', () => {
      mockAppManageLink.mockReturnValueOnce({
        ...APP_DASHBOARD_LINKS,
        links: [],
      });
      const { queryByText } = renderDashboardLanding();

      expect(queryByText(OVERVIEW_ITEM_LABEL)).not.toBeInTheDocument();
      expect(queryByText(DETECTION_RESPONSE_ITEM_LABEL)).not.toBeInTheDocument();
    });
  });

  describe('Security Dashboards', () => {
    it('should render dashboards table', () => {
      const result = renderDashboardLanding();

      expect(result.getByTestId('dashboardsTable')).toBeInTheDocument();
    });

    it('should not render dashboards table if no read capability', () => {
      mockUseCapabilities.mockReturnValueOnce({
        ...DEFAULT_DASHBOARD_CAPABILITIES,
        show: false,
      });
      const result = renderDashboardLanding();

      expect(result.queryByTestId('dashboardsTable')).not.toBeInTheDocument();
    });

    describe('Create Security Dashboard button', () => {
      it('should render', () => {
        const result = renderDashboardLanding();

        expect(result.getByTestId('createDashboardButton')).toBeInTheDocument();
      });

      it('should not render if no write capability', () => {
        mockUseCapabilities.mockReturnValueOnce({
          ...DEFAULT_DASHBOARD_CAPABILITIES,
          createNew: false,
        });
        const result = renderDashboardLanding();

        expect(result.queryByTestId('createDashboardButton')).not.toBeInTheDocument();
      });

      it('should be enabled when link loaded', () => {
        const result = renderDashboardLanding();

        expect(result.getByTestId('createDashboardButton')).not.toHaveAttribute('disabled');
      });

      it('should be disabled when link is not loaded', () => {
        mockUseCreateSecurityDashboard.mockReturnValueOnce({ isLoading: true, url: '' });
        const result = renderDashboardLanding();

        expect(result.getByTestId('createDashboardButton')).toHaveAttribute('disabled');
      });

      it('should link to correct href', () => {
        const result = renderDashboardLanding();

        expect(result.getByTestId('createDashboardButton')).toHaveAttribute('href', URL);
      });
    });
  });
});
