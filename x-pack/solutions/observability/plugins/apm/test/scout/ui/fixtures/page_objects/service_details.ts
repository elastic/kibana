/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { KibanaUrl, ScoutPage } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt';

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
    await this.page.getByTestId('apmMainTemplateHeaderServiceName').waitFor();
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
    await this.page.getByTestId(`${tabName}Tab`).waitFor();
  }

  async gotoOverviewTab(params: { serviceName: string; start: string; end: string }) {
    return this.gotoTab({ ...params, tabName: 'overview' });
  }

  async gotoTransactionsTab(params: { serviceName: string; start: string; end: string }) {
    return this.gotoTab({ ...params, tabName: 'transactions' });
  }

  async gotoDependenciesTab(params: { serviceName: string; start: string; end: string }) {
    return this.gotoTab({ ...params, tabName: 'dependencies' });
  }

  async gotoErrorsTab(params: { serviceName: string; start: string; end: string }) {
    return this.gotoTab({ ...params, tabName: 'errors' });
  }

  async gotoMetricsTab(params: { serviceName: string; start: string; end: string }) {
    return this.gotoTab({ ...params, tabName: 'metrics' });
  }

  async gotoInfrastructureTab(params: { serviceName: string; start: string; end: string }) {
    return this.gotoTab({ ...params, tabName: 'infrastructure' });
  }

  async gotoServiceMapTab(params: { serviceName: string; start: string; end: string }) {
    return this.gotoTab({ ...params, tabName: 'service-map' });
  }

  async gotoLogsTab(params: { serviceName: string; start: string; end: string }) {
    return this.gotoTab({ ...params, tabName: 'logs' });
  }

  async gotoAlertsTab(params: { serviceName: string; start: string; end: string }) {
    return this.gotoTab({ ...params, tabName: 'alerts' });
  }

  async gotoDashboardsTab(params: { serviceName: string; start: string; end: string }) {
    return this.gotoTab({ ...params, tabName: 'dashboards' });
  }
  // #endregion

  // #region Click Tabs
  private async clickTab(tabName: ServiceDetailsPageTabName) {
    await this.page.getByTestId(`${tabName}Tab`).click();
  }

  async clickOverviewTab() {
    return this.clickTab('overview');
  }

  async clickTransactionsTab() {
    return this.clickTab('transactions');
  }

  async clickDependenciesTab() {
    return this.clickTab('dependencies');
  }

  async clickErrorsTab() {
    return this.clickTab('errors');
  }

  async clickMetricsTab() {
    return this.clickTab('metrics');
  }

  async clickInfrastructureTab() {
    return this.clickTab('infrastructure');
  }

  async clickServiceMapTab() {
    return this.clickTab('service-map');
  }

  async clickLogsTab() {
    return this.clickTab('logs');
  }

  async clickAlertsTab() {
    return this.clickTab('alerts');
  }

  async clickDashboardsTab() {
    return this.clickTab('dashboards');
  }
  // #endregion

  // #region Expect Tabs Visible
  private async expectTabVisible(tabName: ServiceDetailsPageTabName) {
    await expect(this.page.getByTestId(`${tabName}Tab`)).toBeVisible();
  }

  async expectOverviewTabVisible() {
    return this.expectTabVisible('overview');
  }

  async expectTransactionsTabVisible() {
    return this.expectTabVisible('transactions');
  }

  async expectDependenciesTabVisible() {
    return this.expectTabVisible('dependencies');
  }

  async expectErrorsTabVisible() {
    return this.expectTabVisible('errors');
  }

  async expectMetricsTabVisible() {
    return this.expectTabVisible('metrics');
  }

  async expectInfrastructureTabVisible() {
    return this.expectTabVisible('infrastructure');
  }

  async expectServiceMapTabVisible() {
    return this.expectTabVisible('service-map');
  }

  async expectLogsTabVisible() {
    return this.expectTabVisible('logs');
  }

  async expectAlertsTabVisible() {
    return this.expectTabVisible('alerts');
  }

  async expectDashboardsTabVisible() {
    return this.expectTabVisible('dashboards');
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
