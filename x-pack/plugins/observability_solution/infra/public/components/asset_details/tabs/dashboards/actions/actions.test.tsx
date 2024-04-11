/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { EditDashboard, UnlinkDashboard, LinkDashboard } from '.';

const TEST_CURRENT_DASHBOARD = {
  title: 'Test Dashboard',
  id: 'test-so-id',
  dashboardSavedObjectId: 'test-dashboard-id',
  assetType: 'host',
  dashboardFilterAssetIdEnabled: true,
} as const;

describe('Custom Dashboards Actions', () => {
  it('should render the edit dashboard action when the user can edit', () => {
    render(
      <EditDashboard
        onRefresh={() => {}}
        currentDashboard={TEST_CURRENT_DASHBOARD}
        assetType={'host'}
        canLinkOrEditCustomDashboard={true}
      />
    );
    expect(screen.getByTestId('infraEditCustomDashboardMenu')).not.toBeDisabled();
    expect(screen.getByTestId('infraEditCustomDashboardMenu')).toHaveTextContent(
      'Edit dashboard link'
    );
  });
  it('should render the edit dashboard action when the user cannot edit', () => {
    render(
      <EditDashboard
        onRefresh={() => {}}
        currentDashboard={TEST_CURRENT_DASHBOARD}
        assetType={'host'}
        canLinkOrEditCustomDashboard={false}
      />
    );

    expect(screen.getByTestId('infraEditCustomDashboardMenu')).toBeDisabled();
    expect(screen.getByTestId('infraEditCustomDashboardMenu')).toHaveTextContent(
      'Edit dashboard link'
    );
  });
  it('should render the link dashboard action when the user can link a dashboard', () => {
    render(<LinkDashboard onRefresh={() => {}} assetType={'host'} canLinkOrEditCustomDashboard />);

    expect(screen.getByTestId('infraAddDashboard')).not.toBeDisabled();
    expect(screen.getByTestId('infraAddDashboard')).toHaveTextContent('Link dashboard');
  });
  it('should render the link dashboard action when the user cannot link a dashboard', () => {
    render(
      <LinkDashboard onRefresh={() => {}} assetType={'host'} canLinkOrEditCustomDashboard={false} />
    );

    expect(screen.getByTestId('infraAddDashboard')).toBeDisabled();
    expect(screen.getByTestId('infraAddDashboard')).toHaveTextContent('Link dashboard');
  });
  it('should render the link new dashboard action when the user can link a dashboard', () => {
    render(
      <LinkDashboard
        onRefresh={() => {}}
        newDashboardButton
        assetType={'host'}
        canLinkOrEditCustomDashboard
      />
    );
    expect(screen.getByTestId('infraLinkDashboardMenu')).not.toBeDisabled();
    expect(screen.getByTestId('infraLinkDashboardMenu')).toHaveTextContent('Link new dashboard');
  });
  it('should render the link new dashboard action when the user cannot link a dashboard', () => {
    render(
      <LinkDashboard
        onRefresh={() => {}}
        newDashboardButton
        assetType={'host'}
        canLinkOrEditCustomDashboard={false}
      />
    );
    expect(screen.getByTestId('infraLinkDashboardMenu')).toBeDisabled();
    expect(screen.getByTestId('infraLinkDashboardMenu')).toHaveTextContent('Link new dashboard');
  });
  it('should render the unlink dashboard action when the user can unlink a dashboard', () => {
    render(
      <UnlinkDashboard
        onRefresh={() => {}}
        assetType={'host'}
        currentDashboard={TEST_CURRENT_DASHBOARD}
        canDeleteCustomDashboard
      />
    );
    expect(screen.getByTestId('infraUnLinkDashboardMenu')).not.toBeDisabled();
    expect(screen.getByTestId('infraUnLinkDashboardMenu')).toHaveTextContent('Unlink dashboard');
  });
  it('should render the unlink dashboard action when the user cannot unlink a dashboard', () => {
    render(
      <UnlinkDashboard
        onRefresh={() => {}}
        assetType={'host'}
        currentDashboard={TEST_CURRENT_DASHBOARD}
        canDeleteCustomDashboard={false}
      />
    );
    expect(screen.getByTestId('infraUnLinkDashboardMenu')).toBeDisabled();
    expect(screen.getByTestId('infraUnLinkDashboardMenu')).toHaveTextContent('Unlink dashboard');
  });
});
