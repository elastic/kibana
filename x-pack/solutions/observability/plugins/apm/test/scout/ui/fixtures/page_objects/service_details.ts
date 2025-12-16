/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaUrl, ScoutPage } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt';
import { waitForChartToLoad, waitForTableToLoad } from './utils';

type ServiceDetailsPageTabName =
  | 'overview'
  | 'transactions'
  | 'dependencies'
  | 'errors'
  | 'metrics'
  | 'infrastructure'
  | 'service-map'
  | 'logs'
  | 'alerts'
  | 'dashboards';

export class ServiceDetailsPage {
  constructor(private readonly page: ScoutPage, private readonly kbnUrl: KibanaUrl) {}

  async gotoPage(params: { serviceName: string; start: string; end: string }) {
    const { serviceName, start, end } = params;

    const urlServiceName = encodeURIComponent(serviceName);

    await this.page.goto(
      `${this.kbnUrl.app('apm')}/services/${urlServiceName}?${new URLSearchParams({
        rangeFrom: start,
        rangeTo: end,
      })}`
    );
    await this.page.getByRole('tablist').waitFor();
  }

  // #region Go to Tabs
  private async gotoTab(params: {
    serviceName: string;
    tabName: ServiceDetailsPageTabName;
    start: string;
    end: string;
  }) {
    const { serviceName, tabName, start, end } = params;

    const urlServiceName = encodeURIComponent(serviceName);

    await this.page.goto(
      `${this.kbnUrl.app('apm')}/services/${urlServiceName}/${tabName}?${new URLSearchParams({
        rangeFrom: start,
        rangeTo: end,
      })}`
    );
  }

  // TODO: Add waitForXTabToLoad to all tabs

  async gotoOverviewTab(params: { serviceName: string; start: string; end: string }) {
    await this.gotoTab({ ...params, tabName: 'overview' });
  }

  async gotoTransactionsTab(params: { serviceName: string; start: string; end: string }) {
    await this.gotoTab({ ...params, tabName: 'transactions' });
  }

  private async waitForDependenciesTabToLoad() {
    await Promise.all([
      waitForChartToLoad(this.page, 'serviceDependenciesBreakdownChart'),
      waitForTableToLoad(this.page, 'dependenciesTable'),
    ]);
  }

  async gotoDependenciesTab(params: { serviceName: string; start: string; end: string }) {
    await this.gotoTab({ ...params, tabName: 'dependencies' });
    await this.waitForDependenciesTabToLoad();
  }

  async gotoErrorsTab(params: { serviceName: string; start: string; end: string }) {
    await this.gotoTab({ ...params, tabName: 'errors' });
  }

  async gotoMetricsTab(params: { serviceName: string; start: string; end: string }) {
    await this.gotoTab({ ...params, tabName: 'metrics' });
  }

  async gotoInfrastructureTab(params: { serviceName: string; start: string; end: string }) {
    await this.gotoTab({ ...params, tabName: 'infrastructure' });
  }

  async gotoServiceMapTab(params: { serviceName: string; start: string; end: string }) {
    await this.gotoTab({ ...params, tabName: 'service-map' });
  }

  async gotoLogsTab(params: { serviceName: string; start: string; end: string }) {
    await this.gotoTab({ ...params, tabName: 'logs' });
  }

  async gotoAlertsTab(params: { serviceName: string; start: string; end: string }) {
    await this.gotoTab({ ...params, tabName: 'alerts' });
  }

  async gotoDashboardsTab(params: { serviceName: string; start: string; end: string }) {
    await this.gotoTab({ ...params, tabName: 'dashboards' });
  }
  // #endregion

  // #region Click Tabs
  private async clickTab(tabName: ServiceDetailsPageTabName) {
    await this.page.getByTestId(`${tabName}Tab`).click();
  }

  async clickOverviewTab() {
    await this.clickTab('overview');
  }

  async clickTransactionsTab() {
    await this.clickTab('transactions');
  }

  async clickDependenciesTab() {
    await this.clickTab('dependencies');
  }

  async clickErrorsTab() {
    await this.clickTab('errors');
  }

  async clickMetricsTab() {
    await this.clickTab('metrics');
  }

  async clickInfrastructureTab() {
    await this.clickTab('infrastructure');
  }

  async clickServiceMapTab() {
    await this.clickTab('service-map');
  }

  async clickLogsTab() {
    await this.clickTab('logs');
  }

  async clickAlertsTab() {
    await this.clickTab('alerts');
  }

  async clickDashboardsTab() {
    await this.clickTab('dashboards');
  }
  // #endregion

  // #region Expect Tabs Visible
  private async expectTabVisible(tabName: ServiceDetailsPageTabName) {
    await expect(this.page.getByTestId(`${tabName}Tab`)).toBeVisible();
  }

  async expectOverviewTabVisible() {
    await this.expectTabVisible('overview');
  }

  async expectTransactionsTabVisible() {
    await this.expectTabVisible('transactions');
  }

  async expectDependenciesTabVisible() {
    await this.expectTabVisible('dependencies');
  }

  async expectErrorsTabVisible() {
    await this.expectTabVisible('errors');
  }

  async expectMetricsTabVisible() {
    await this.expectTabVisible('metrics');
  }

  async expectInfrastructureTabVisible() {
    await this.expectTabVisible('infrastructure');
  }

  async expectServiceMapTabVisible() {
    await this.expectTabVisible('service-map');
  }

  async expectLogsTabVisible() {
    await this.expectTabVisible('logs');
  }

  async expectAlertsTabVisible() {
    await this.expectTabVisible('alerts');
  }

  async expectDashboardsTabVisible() {
    await this.expectTabVisible('dashboards');
  }
  // #endregion

  // #region Expect Tabs Selected
  private async expectTabSelected(tabName: ServiceDetailsPageTabName) {
    await expect(this.page.getByTestId(`${tabName}Tab`)).toHaveAttribute('aria-selected', 'true');
  }

  async expectOverviewTabSelected() {
    await this.expectTabSelected('overview');
  }

  async expectTransactionsTabSelected() {
    await this.expectTabSelected('transactions');
  }

  async expectDependenciesTabSelected() {
    await this.expectTabSelected('dependencies');
  }

  async expectErrorsTabSelected() {
    await this.expectTabSelected('errors');
  }

  async expectMetricsTabSelected() {
    await this.expectTabSelected('metrics');
  }

  async expectInfrastructureTabSelected() {
    await this.expectTabSelected('infrastructure');
  }

  async expectServiceMapTabSelected() {
    await this.expectTabSelected('service-map');
  }

  async expectLogsTabSelected() {
    await this.expectTabSelected('logs');
  }

  async expectAlertsTabSelected() {
    await this.expectTabSelected('alerts');
  }

  async expectDashboardsTabSelected() {
    await this.expectTabSelected('dashboards');
  }
  // #endregion

  // #region Dependencies Tab
  async expectDependenciesTableVisible() {
    await expect(this.page.getByTestId('dependenciesTable')).toBeVisible();
  }

  async expectDependencyInDependenciesTable(dependencyName: string) {
    await expect(this.page.getByRole('link', { name: dependencyName })).toBeVisible();
  }

  async clickDependencyInDependenciesTable(dependencyName: string) {
    await this.page.getByRole('link', { name: dependencyName }).click();
  }

  async expectDependenciesBreakdownChartVisible() {
    await expect(this.page.getByTestId('serviceDependenciesBreakdownChart')).toBeVisible();
  }
  // #endregion
}
