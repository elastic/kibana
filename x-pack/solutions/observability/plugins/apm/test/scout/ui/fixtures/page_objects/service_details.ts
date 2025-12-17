/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaUrl, ScoutPage } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt';
import { waitForChartToLoad, waitForTableToLoad } from './utils';
import { testData } from '..';

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
  readonly SERVICE_NAME = 'opbeans-java';

  constructor(private readonly page: ScoutPage, private readonly kbnUrl: KibanaUrl) {}

  async gotoPage(overrides: { serviceName?: string; rangeFrom?: string; rangeTo?: string } = {}) {
    const urlServiceName = encodeURIComponent(overrides.serviceName ?? this.SERVICE_NAME);

    await this.page.goto(
      `${this.kbnUrl.app('apm')}/services/${urlServiceName}?${new URLSearchParams({
        rangeFrom: overrides.rangeFrom ?? testData.OPBEANS_START_DATE,
        rangeTo: overrides.rangeTo ?? testData.OPBEANS_END_DATE,
      })}`
    );
    await this.page.getByRole('tablist').waitFor();
  }

  // #region Go to Tabs
  private async gotoTab(
    tabName: ServiceDetailsPageTabName,
    overrides: {
      serviceName?: string;
      rangeFrom?: string;
      rangeTo?: string;
    } = {}
  ) {
    const urlServiceName = encodeURIComponent(overrides.serviceName ?? this.SERVICE_NAME);

    await this.page.goto(
      `${this.kbnUrl.app('apm')}/services/${urlServiceName}/${tabName}?${new URLSearchParams({
        rangeFrom: overrides.rangeFrom ?? testData.OPBEANS_START_DATE,
        rangeTo: overrides.rangeTo ?? testData.OPBEANS_END_DATE,
      })}`
    );
  }

  async gotoOverviewTab(
    overrides: { serviceName?: string; rangeFrom?: string; rangeTo?: string } = {}
  ) {
    await this.gotoTab('overview', overrides);
  }

  async gotoTransactionsTab(
    overrides: { serviceName?: string; rangeFrom?: string; rangeTo?: string } = {}
  ) {
    await this.gotoTab('transactions', overrides);
  }

  private async waitForDependenciesTabToLoad() {
    await Promise.all([
      waitForChartToLoad(this.page, 'serviceDependenciesBreakdownChart'),
      waitForTableToLoad(this.page, 'dependenciesTable'),
    ]);
  }

  async gotoDependenciesTab(
    overrides: { serviceName?: string; rangeFrom?: string; rangeTo?: string } = {}
  ) {
    await this.gotoTab('dependencies', overrides);
    await this.waitForDependenciesTabToLoad();
  }

  async gotoErrorsTab(
    overrides: { serviceName?: string; rangeFrom?: string; rangeTo?: string } = {}
  ) {
    await this.gotoTab('errors', overrides);
  }

  async gotoMetricsTab(
    overrides: { serviceName?: string; rangeFrom?: string; rangeTo?: string } = {}
  ) {
    await this.gotoTab('metrics', overrides);
  }

  async gotoInfrastructureTab(
    overrides: { serviceName?: string; rangeFrom?: string; rangeTo?: string } = {}
  ) {
    await this.gotoTab('infrastructure', overrides);
  }

  async gotoServiceMapTab(
    overrides: { serviceName?: string; rangeFrom?: string; rangeTo?: string } = {}
  ) {
    await this.gotoTab('service-map', overrides);
  }

  async gotoLogsTab(
    overrides: { serviceName?: string; rangeFrom?: string; rangeTo?: string } = {}
  ) {
    await this.gotoTab('logs', overrides);
  }

  async gotoAlertsTab(
    overrides: { serviceName?: string; rangeFrom?: string; rangeTo?: string } = {}
  ) {
    await this.gotoTab('alerts', overrides);
  }

  async gotoDashboardsTab(
    overrides: { serviceName?: string; rangeFrom?: string; rangeTo?: string } = {}
  ) {
    await this.gotoTab('dashboards', overrides);
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
