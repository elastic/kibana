/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaUrl, ScoutPage } from '@kbn/scout-oblt';
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

  readonly dependenciesTabDependenciesTable;
  readonly dependenciesTabDependenciesBreakdownChart;

  constructor(private readonly page: ScoutPage, private readonly kbnUrl: KibanaUrl) {
    this.dependenciesTabDependenciesTable = this.page.getByTestId('dependenciesTable');
    this.dependenciesTabDependenciesBreakdownChart = this.page.getByTestId(
      'serviceDependenciesBreakdownChart'
    );
  }

  async goToPage(overrides: { serviceName?: string; rangeFrom?: string; rangeTo?: string } = {}) {
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
  private async goToTab(
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

  async goToOverviewTab(
    overrides: { serviceName?: string; rangeFrom?: string; rangeTo?: string } = {}
  ) {
    await this.goToTab('overview', overrides);
  }

  async goToTransactionsTab(
    overrides: { serviceName?: string; rangeFrom?: string; rangeTo?: string } = {}
  ) {
    await this.goToTab('transactions', overrides);
  }

  private async waitForDependenciesTabToLoad() {
    await Promise.all([
      waitForChartToLoad(this.page, 'serviceDependenciesBreakdownChart'),
      waitForTableToLoad(this.page, 'dependenciesTable'),
    ]);
  }

  async goToDependenciesTab(
    overrides: { serviceName?: string; rangeFrom?: string; rangeTo?: string } = {}
  ) {
    await this.goToTab('dependencies', overrides);
    await this.waitForDependenciesTabToLoad();
  }

  async goToErrorsTab(
    overrides: { serviceName?: string; rangeFrom?: string; rangeTo?: string } = {}
  ) {
    await this.goToTab('errors', overrides);
  }

  async goToMetricsTab(
    overrides: { serviceName?: string; rangeFrom?: string; rangeTo?: string } = {}
  ) {
    await this.goToTab('metrics', overrides);
  }

  async goToInfrastructureTab(
    overrides: { serviceName?: string; rangeFrom?: string; rangeTo?: string } = {}
  ) {
    await this.goToTab('infrastructure', overrides);
  }

  async goToServiceMapTab(
    overrides: { serviceName?: string; rangeFrom?: string; rangeTo?: string } = {}
  ) {
    await this.goToTab('service-map', overrides);
  }

  async goToLogsTab(
    overrides: { serviceName?: string; rangeFrom?: string; rangeTo?: string } = {}
  ) {
    await this.goToTab('logs', overrides);
  }

  async goToAlertsTab(
    overrides: { serviceName?: string; rangeFrom?: string; rangeTo?: string } = {}
  ) {
    await this.goToTab('alerts', overrides);
  }

  async goToDashboardsTab(
    overrides: { serviceName?: string; rangeFrom?: string; rangeTo?: string } = {}
  ) {
    await this.goToTab('dashboards', overrides);
  }
  // #endregion

  // #region Get Tabs
  private getTab(tabName: ServiceDetailsPageTabName) {
    return this.page.getByTestId(`${tabName}Tab`);
  }

  getOverviewTab() {
    return this.getTab('overview');
  }

  getTransactionsTab() {
    return this.getTab('transactions');
  }

  getDependenciesTab() {
    return this.getTab('dependencies');
  }

  getErrorsTab() {
    return this.getTab('errors');
  }

  getMetricsTab() {
    return this.getTab('metrics');
  }

  getInfrastructureTab() {
    return this.getTab('infrastructure');
  }

  getServiceMapTab() {
    return this.getTab('service-map');
  }

  getLogsTab() {
    return this.getTab('logs');
  }

  getAlertsTab() {
    return this.getTab('alerts');
  }

  getDashboardsTab() {
    return this.getTab('dashboards');
  }
  // #endregion

  // #region Click Tabs
  private async clickTab(tabName: ServiceDetailsPageTabName) {
    await this.getTab(tabName).click();
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

  // #region Dependencies Tab
  getDependencyInDependenciesTable(dependencyName: string) {
    return this.dependenciesTabDependenciesTable.getByRole('link', { name: dependencyName });
  }

  async clickDependencyInDependenciesTable(dependencyName: string) {
    await this.getDependencyInDependenciesTable(dependencyName).click();
  }
  // #endregion
}
