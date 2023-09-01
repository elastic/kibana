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
import { APP_UI_ID } from '../../../common/constants';
import { NavigationProvider, SecurityPageName } from '@kbn/security-solution-navigation';
import { TestProviders } from '../../common/mock';
import { useNavigateTo } from '../../common/lib/kibana';
import { useGetSecuritySolutionUrl } from '../../common/components/link_to';

const mockDashboardTopNav = DashboardTopNav as jest.Mock;

jest.mock('../../common/lib/kibana', () => {
  const actual = jest.requireActual('../../common/lib/kibana');
  return { ...actual, useNavigateTo: jest.fn() };
});
jest.mock('../../common/components/link_to', () => ({ useGetSecuritySolutionUrl: jest.fn() }));
jest.mock('@kbn/dashboard-plugin/public', () => ({
  DashboardTopNav: jest.fn(() => <div data-test-subj="dashboard-top-nav" />),
}));
const mockCore = coreMock.createStart();
const mockNavigateTo = jest.fn(({ url }: { url: string }) => url);
const mockGetSecuritySolutionUrl = jest.fn();

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <TestProviders>
    <NavigationProvider core={mockCore}>{children}</NavigationProvider>
  </TestProviders>
);

describe('DashboardToolBar', () => {
  beforeAll(() => {
    (useNavigateTo as jest.Mock).mockReturnValue({ navigateTo: mockNavigateTo });
    (useGetSecuritySolutionUrl as jest.Mock).mockReturnValue(mockGetSecuritySolutionUrl);
  });
  beforeEach(() => {
    jest.clearAllMocks();
  });
  it('should render the DashboardToolBar component', () => {
    const mockDashboardContainer = {
      select: jest.fn(),
    } as unknown as DashboardAPI;
    const mockOnLoad = jest.fn();
    const mockDashboardId = 'dashboard123';

    render(
      <DashboardToolBar
        dashboardContainer={mockDashboardContainer}
        onLoad={mockOnLoad}
        dashboardId={mockDashboardId}
      />,
      {
        wrapper,
      }
    );

    expect(screen.getByTestId('dashboard-top-nav')).toBeInTheDocument();
  });

  it('should render the DashboardToolBar component with the correct props for view mode', () => {
    const mockDashboardContainer = {
      select: jest.fn(),
    } as unknown as DashboardAPI;
    const mockOnLoad = jest.fn();
    const mockDashboardId = 'dashboard123';

    render(
      <DashboardToolBar
        dashboardContainer={mockDashboardContainer}
        onLoad={mockOnLoad}
        dashboardId={mockDashboardId}
      />,
      {
        wrapper,
      }
    );

    expect(mockOnLoad).toHaveBeenCalledWith(ViewMode.VIEW);
  });

  it('should render the DashboardTopNav component with the correct redirect to listing url', () => {
    const mockDashboardContainer = {
      select: jest.fn(),
    } as unknown as DashboardAPI;
    const mockOnLoad = jest.fn();

    render(
      <DashboardToolBar
        dashboardContainer={mockDashboardContainer}
        onLoad={mockOnLoad}
        dashboardId={undefined}
      />,
      {
        wrapper,
      }
    );

    mockDashboardTopNav.mock.calls[0][0].redirectTo({ destination: 'listing' });
  });

  it('should render the DashboardTopNav component with the correct redirect to create dashboard url', () => {
    const mockDashboardContainer = {
      select: jest.fn(),
    } as unknown as DashboardAPI;
    const mockOnLoad = jest.fn();

    render(
      <DashboardToolBar
        dashboardContainer={mockDashboardContainer}
        onLoad={mockOnLoad}
        dashboardId={undefined}
      />,
      {
        wrapper,
      }
    );

    mockDashboardTopNav.mock.calls[0][0].redirectTo({ destination: 'dashboard' });

    expect(mockGetSecuritySolutionUrl.mock.calls[1][0].deepLinkId).toEqual(
      SecurityPageName.dashboards
    );
    expect(mockGetSecuritySolutionUrl.mock.calls[1][0].path).toEqual(`/create`);
  });

  it('should render the DashboardTopNav component with the correct redirect to edit dashboard url', () => {
    const mockDashboardContainer = {
      select: jest.fn(),
    } as unknown as DashboardAPI;
    const mockOnLoad = jest.fn();
    const mockDashboardId = 'dashboard123';

    render(
      <DashboardToolBar
        dashboardContainer={mockDashboardContainer}
        onLoad={mockOnLoad}
        dashboardId={mockDashboardId}
      />,
      {
        wrapper,
      }
    );

    mockDashboardTopNav.mock.calls[0][0].redirectTo({
      destination: 'dashboard',
      id: mockDashboardId,
    });

    expect(mockGetSecuritySolutionUrl.mock.calls[1][0].deepLinkId).toEqual(
      SecurityPageName.dashboards
    );
    expect(mockGetSecuritySolutionUrl.mock.calls[1][0].path).toEqual(`${mockDashboardId}/edit`);
  });

  it('should render the DashboardTopNav component with the correct props', () => {
    const mockDashboardContainer = {
      select: jest.fn(),
    } as unknown as DashboardAPI;
    const mockOnLoad = jest.fn();
    const mockDashboardId = 'dashboard123';

    render(
      <DashboardToolBar
        dashboardContainer={mockDashboardContainer}
        onLoad={mockOnLoad}
        dashboardId={mockDashboardId}
      />,
      {
        wrapper,
      }
    );

    expect(mockDashboardTopNav.mock.calls[0][0].embedSettings).toEqual(
      expect.objectContaining({
        editingToolBarCss: expect.any(Object),
        forceHideDatePicker: true,
        forceHideFilterBar: true,
        forceHideQueryInput: true,
        forceShowTopNavMenu: true,
        showBackgroundColor: false,
        showBorderBottom: false,
        showDatePicker: false,
        showFullScreenButton: false,
        showQueryInput: false,
        showStickyTopNav: false,
        topNavMenuAlignRight: true,
      })
    );
    expect(mockDashboardTopNav.mock.calls[0][0].originatingApp).toEqual(APP_UI_ID);
    expect(mockDashboardTopNav.mock.calls[0][0].originatingPath).toEqual(
      `dashboards/${mockDashboardId}/edit`
    );
  });

  it('should render the DashboardTopNav component with the correct props when no dashboard id', () => {
    const mockDashboardContainer = {
      select: jest.fn(),
    } as unknown as DashboardAPI;
    const mockOnLoad = jest.fn();

    render(
      <DashboardToolBar
        dashboardContainer={mockDashboardContainer}
        onLoad={mockOnLoad}
        dashboardId={undefined}
      />,
      {
        wrapper,
      }
    );

    expect(mockDashboardTopNav.mock.calls[0][0].originatingPath).toEqual(`dashboards/create`);
  });

  it('should render the DashboardToolBar component without DashboardTopNav if dashboardContainer is undefined', () => {
    const { container } = render(
      <DashboardToolBar dashboardContainer={undefined} onLoad={() => {}} dashboardId={undefined} />,
      {
        wrapper,
      }
    );

    expect(container.firstChild).toBeNull();
  });
});
