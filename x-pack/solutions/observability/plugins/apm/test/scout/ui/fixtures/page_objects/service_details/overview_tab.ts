/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaUrl, Locator, ScoutPage } from '@kbn/scout-oblt';
import type { ServiceDetailsPageTabName } from './service_details_tab';
import { ServiceDetailsTab } from './service_details_tab';
import { EXTENDED_TIMEOUT } from '../../constants';

export class OverviewTab extends ServiceDetailsTab {
  public readonly tabName: ServiceDetailsPageTabName = 'overview';
  public readonly tab: Locator;

  // Chart and table locators
  public readonly latencyChart: Locator;
  public readonly throughputChart: Locator;
  public readonly transactionsGroupTable: Locator;
  public readonly serviceOverviewErrorsTable: Locator;
  public readonly instancesLatencyDistribution: Locator;
  public readonly serviceOverviewInstancesTable: Locator;

  constructor(page: ScoutPage, kbnUrl: KibanaUrl, defaultServiceName: string) {
    super(page, kbnUrl, defaultServiceName);
    this.tab = this.page.getByTestId(`${this.tabName}Tab`);
    this.latencyChart = this.page.getByTestId('latencyChart');
    this.throughputChart = this.page.getByTestId('throughput');
    this.transactionsGroupTable = this.page.getByTestId('transactionsGroupTable');
    this.serviceOverviewErrorsTable = this.page.getByTestId('serviceOverviewErrorsTable');
    this.instancesLatencyDistribution = this.page.getByTestId('instancesLatencyDistribution');
    this.serviceOverviewInstancesTable = this.page.getByTestId('serviceOverviewInstancesTable');
  }

  protected async waitForTabLoad(): Promise<void> {
    await Promise.all([
      this.latencyChart.waitFor({ state: 'visible', timeout: EXTENDED_TIMEOUT }),
      this.throughputChart.waitFor({ state: 'visible', timeout: EXTENDED_TIMEOUT }),
    ]);
  }

  // #region Charts and Tables
  getInstancesTableContainer() {
    return this.page.getByTestId('serviceInstancesTableContainer');
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
}
