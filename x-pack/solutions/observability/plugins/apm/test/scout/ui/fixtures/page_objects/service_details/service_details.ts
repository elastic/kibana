/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createLazyPageObject, type KibanaUrl, type ScoutPage } from '@kbn/scout-oblt';
import { testData, BIGGER_TIMEOUT } from '../..';
import { DependenciesTab } from './dependencies_tab';
import { AlertsTab } from './alerts_tab';

export class ServiceDetailsPage {
  public readonly SERVICE_NAME = testData.SERVICE_OPBEANS_JAVA;

  public readonly dependenciesTab: DependenciesTab;
  public readonly alertsTab: AlertsTab;

  // Chart and table locators
  readonly latencyChart;
  readonly throughputChart;
  readonly transactionsGroupTable;
  readonly serviceOverviewErrorsTable;
  readonly instancesLatencyDistribution;
  readonly serviceOverviewInstancesTable;

  constructor(private readonly page: ScoutPage, private readonly kbnUrl: KibanaUrl) {
    this.dependenciesTab = createLazyPageObject(
      DependenciesTab,
      this.page,
      this.kbnUrl,
      this.SERVICE_NAME
    );
    this.alertsTab = createLazyPageObject(AlertsTab, this.page, this.kbnUrl, this.SERVICE_NAME);

    this.latencyChart = this.page.getByTestId('latencyChart');
    this.throughputChart = this.page.getByTestId('throughput');
    this.transactionsGroupTable = this.page.getByTestId('transactionsGroupTable');
    this.serviceOverviewErrorsTable = this.page.getByTestId('serviceOverviewErrorsTable');
    this.instancesLatencyDistribution = this.page.getByTestId('instancesLatencyDistribution');
    this.serviceOverviewInstancesTable = this.page.getByTestId('serviceOverviewInstancesTable');
  }

  public async goToPage(
    overrides: { serviceName?: string; rangeFrom?: string; rangeTo?: string } = {}
  ) {
    const urlServiceName = encodeURIComponent(overrides.serviceName ?? this.SERVICE_NAME);

    await this.page.goto(
      `${this.kbnUrl.app('apm')}/services/${urlServiceName}?${new URLSearchParams({
        rangeFrom: overrides.rangeFrom ?? testData.OPBEANS_START_DATE,
        rangeTo: overrides.rangeTo ?? testData.OPBEANS_END_DATE,
      })}`
    );
    await this.page.getByRole('tablist').waitFor({ state: 'visible', timeout: BIGGER_TIMEOUT });
  }

  // #region Go to Tabs
  async goToOverviewTab(
    overrides: { serviceName?: string; rangeFrom?: string; rangeTo?: string } = {}
  ) {
    const urlServiceName = encodeURIComponent(overrides.serviceName ?? this.SERVICE_NAME);

    await this.page.goto(
      `${this.kbnUrl.app('apm')}/services/${urlServiceName}/overview?${new URLSearchParams({
        rangeFrom: overrides.rangeFrom ?? testData.OPBEANS_START_DATE,
        rangeTo: overrides.rangeTo ?? testData.OPBEANS_END_DATE,
      })}`
    );
    await this.page
      .getByTestId('apmUnifiedSearchBar')
      .waitFor({ state: 'visible', timeout: BIGGER_TIMEOUT });
  }
  // #endregion

  // #region Overview Tab - Charts and Tables
  async waitForOverviewTabToLoad() {
    await Promise.all([
      this.latencyChart.waitFor({ state: 'visible', timeout: BIGGER_TIMEOUT }),
      this.throughputChart.waitFor({ state: 'visible', timeout: BIGGER_TIMEOUT }),
    ]);
  }

  getInstancesTableContainer() {
    return this.page.getByTestId('serviceInstancesTableContainer');
  }

  getInstanceRow(instanceName: string) {
    return this.serviceOverviewInstancesTable.getByRole('row', { name: new RegExp(instanceName) });
  }

  getInstanceDetailsButton(instanceName: string) {
    return this.page.getByTestId(`instanceDetailsButton_${instanceName}`);
  }

  async clickInstanceDetailsButton(instanceName: string) {
    await this.getInstanceDetailsButton(instanceName).click();
  }

  getInstanceActionsButton(instanceName: string) {
    return this.page.getByTestId(`instanceActionsButton_${instanceName}`);
  }

  async clickInstanceActionsButton(instanceName: string) {
    await this.getInstanceActionsButton(instanceName).click();
  }

  getViewTransactionsLink() {
    return this.page.getByRole('link', { name: 'View transactions' });
  }

  async clickViewTransactionsLink() {
    await this.getViewTransactionsLink().click();
  }

  getViewErrorsLink() {
    return this.page.getByRole('link', { name: 'View errors' });
  }

  async clickViewErrorsLink() {
    await this.getViewErrorsLink().click();
  }
  // #endregion

  // #region Header Filters
  getTransactionTypeFilter() {
    return this.page.getByTestId('headerFilterTransactionType');
  }

  async selectTransactionType(type: string) {
    await this.getTransactionTypeFilter().selectOption(type);
  }

  getEnvironmentFilter() {
    return this.page.getByTestId('environmentFilter');
  }

  async selectEnvironment(environment: string) {
    const environmentFilter = this.getEnvironmentFilter();
    await environmentFilter.locator('input').click();
    const optionToSelect = this.page.getByRole('option', { name: environment });
    await optionToSelect.waitFor({ state: 'visible' });
    await optionToSelect.click();
  }

  getComparisonSelect() {
    return this.page.getByTestId('comparisonSelect');
  }

  async selectComparison(offset: string) {
    await this.getComparisonSelect().selectOption(offset);
  }

  getRefreshButton() {
    return this.page.getByRole('button', { name: 'Refresh' });
  }

  async clickRefreshButton() {
    await this.getRefreshButton().click();
  }
  // #endregion

  // #region Service Icons
  getServiceIcon() {
    return this.page.getByTestId('service');
  }

  async clickServiceIcon() {
    await this.getServiceIcon().click();
  }

  getOpenTelemetryIcon() {
    return this.page.getByTestId('popover_Service');
  }

  async clickOpenTelemetryIcon() {
    await this.getOpenTelemetryIcon().click();
  }
  // #endregion

  // #region Mobile Services
  async goToMobileServiceOverview(
    serviceName: string,
    overrides: { rangeFrom?: string; rangeTo?: string } = {}
  ) {
    const urlServiceName = encodeURIComponent(serviceName);

    await this.page.goto(
      `${this.kbnUrl.app('apm')}/mobile-services/${urlServiceName}/overview?${new URLSearchParams({
        rangeFrom: overrides.rangeFrom ?? testData.OPBEANS_START_DATE,
        rangeTo: overrides.rangeTo ?? testData.OPBEANS_END_DATE,
      })}`
    );
    await this.page.getByRole('tablist').waitFor({ state: 'visible', timeout: BIGGER_TIMEOUT });
  }
  // #endregion

  // #region Service Header
  getServiceHeaderName() {
    return this.page.getByTestId('apmMainTemplateHeaderServiceName');
  }
  // #endregion

  // #region Tab Getters
  getOverviewTab() {
    return this.page.getByRole('tab', { name: 'Overview' });
  }

  getTransactionsTab() {
    return this.page.getByRole('tab', { name: 'Transactions' });
  }

  getErrorsTab() {
    return this.page.getByRole('tab', { name: 'Errors' });
  }

  getServiceMapTab() {
    return this.page.getByRole('tab', { name: 'Service map' });
  }

  async clickTransactionsTab() {
    await this.getTransactionsTab().click();
    await this.page
      .getByRole('heading', { name: 'Transactions', exact: true })
      .waitFor({ state: 'visible', timeout: BIGGER_TIMEOUT });
  }

  async clickErrorsTab() {
    await this.getErrorsTab().click();
    await this.page
      .getByTestId('errorDistribution')
      .waitFor({ state: 'visible', timeout: BIGGER_TIMEOUT });
  }
  // #endregion

  // #region Transactions Table
  getTransactionsTable() {
    return this.transactionsGroupTable;
  }

  getTransactionLink(transactionName: string) {
    return this.transactionsGroupTable.getByRole('link', { name: transactionName });
  }

  async clickTransactionLink(transactionName: string) {
    await this.getTransactionLink(transactionName).click();
  }
  // #endregion

  // #region Errors Table
  getErrorsTable() {
    return this.serviceOverviewErrorsTable;
  }

  getErrorLink(errorMessage: string) {
    return this.serviceOverviewErrorsTable.getByRole('link', { name: new RegExp(errorMessage) });
  }

  async clickErrorLink(errorMessage: string) {
    await this.getErrorLink(errorMessage).click();
  }
  // #endregion
}
