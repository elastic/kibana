/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { DashboardToolBar } from './dashboard_tool_bar';
import type { DashboardAPI } from '@kbn/dashboard-plugin/public';
import { coreMock } from '@kbn/core/public/mocks';
import { DashboardTopNav } from '@kbn/dashboard-plugin/public';
import { ViewMode } from '@kbn/embeddable-plugin/public';
import { APP_NAME } from '../../../common/constants';
import { NavigationProvider, SecurityPageName } from '@kbn/security-solution-navigation';
import { TestProviders } from '../../common/mock';
import { useNavigateTo } from '../../common/lib/kibana';
import { useGetSecuritySolutionUrl } from '../../common/components/link_to';
import { DashboardContainerContextProvider } from '../context/dashboard_container_context';

const mockDashboardTopNav = DashboardTopNav as jest.Mock;

jest.mock('../../common/lib/kibana', () => {
  const actual = jest.requireActual('../../common/lib/kibana');
  return {
    ...actual,
    useNavigateTo: jest.fn(),
    useCapabilities: jest.fn(() => ({ showWriteControls: true })),
  };
});
jest.mock('../../common/components/link_to', () => ({ useGetSecuritySolutionUrl: jest.fn() }));
jest.mock('@kbn/dashboard-plugin/public', () => ({
  DashboardTopNav: jest.fn(() => <div data-test-subj="dashboard-top-nav" />),
}));
const mockCore = coreMock.createStart();
const mockNavigateTo = jest.fn(({ url }: { url: string }) => url);
const mockGetSecuritySolutionUrl = jest.fn();
const mockDashboardContainer = {
  select: jest.fn(),
} as unknown as DashboardAPI;

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <TestProviders>
    <DashboardContainerContextProvider dashboardContainer={mockDashboardContainer}>
      <NavigationProvider core={mockCore}>{children}</NavigationProvider>
    </DashboardContainerContextProvider>
  </TestProviders>
);

describe('DashboardToolBar', () => {
  const mockOnLoad = jest.fn();

  beforeAll(() => {
    (useNavigateTo as jest.Mock).mockReturnValue({ navigateTo: mockNavigateTo });
    (useGetSecuritySolutionUrl as jest.Mock).mockReturnValue(mockGetSecuritySolutionUrl);
  });
  beforeEach(() => {
    jest.clearAllMocks();
    render(<DashboardToolBar onLoad={mockOnLoad} />, {
      wrapper,
    });
  });
  it('should render the DashboardToolBar component', () => {
    expect(screen.getByTestId('dashboard-top-nav')).toBeInTheDocument();
  });

  it('should render the DashboardToolBar component with the correct props for view mode', () => {
    expect(mockOnLoad).toHaveBeenCalledWith(ViewMode.VIEW);
  });

  it('should render the DashboardTopNav component with the correct redirect to listing url', () => {
    mockDashboardTopNav.mock.calls[0][0].redirectTo({ destination: 'listing' });
  });

  it('should render the DashboardTopNav component with the correct breadcrumb', () => {
    expect(mockGetSecuritySolutionUrl.mock.calls[1][0].deepLinkId).toEqual(
      SecurityPageName.landing
    );
    expect(mockDashboardTopNav.mock.calls[0][0].customLeadingBreadCrumbs[0].text).toEqual(APP_NAME);
  });

  it('should render the DashboardTopNav component with the correct redirect to create dashboard url', () => {
    mockDashboardTopNav.mock.calls[0][0].redirectTo({ destination: 'dashboard' });

    expect(mockGetSecuritySolutionUrl.mock.calls[2][0].deepLinkId).toEqual(
      SecurityPageName.dashboards
    );
    expect(mockGetSecuritySolutionUrl.mock.calls[2][0].path).toEqual(`/create`);
  });

  it('should render the DashboardTopNav component with the correct redirect to edit dashboard url', () => {
    const mockDashboardId = 'dashboard123';

    mockDashboardTopNav.mock.calls[0][0].redirectTo({
      destination: 'dashboard',
      id: mockDashboardId,
    });
    expect(mockGetSecuritySolutionUrl.mock.calls[2][0].deepLinkId).toEqual(
      SecurityPageName.dashboards
    );
    expect(mockGetSecuritySolutionUrl.mock.calls[2][0].path).toEqual(`${mockDashboardId}/edit`);
  });

  it('should render the DashboardTopNav component with the correct props', () => {
    expect(mockDashboardTopNav.mock.calls[0][0].embedSettings).toEqual(
      expect.objectContaining({
        forceHideDatePicker: true,
        forceHideFilterBar: true,
        forceHideQueryInput: true,
        forceShowTopNavMenu: true,
        setHeaderActionMenu: undefined,
        showBorderBottom: false,
        showDatePicker: false,
        forceShowQueryInput: false,
      })
    );
  });
});
