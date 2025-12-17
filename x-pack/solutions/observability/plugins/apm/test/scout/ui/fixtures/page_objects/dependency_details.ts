/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaUrl, ScoutPage } from '@kbn/scout-oblt';
import { capitalize } from 'lodash';
import { waitForChartToLoad, waitForTableToLoad } from './utils';
import { testData } from '..';

type DependencyDetailsPageTabName = 'overview' | 'operations';

export class DependencyDetailsPage {
  readonly DEPENDENCY_NAME = 'postgresql';

  readonly latencyChart;
  readonly throughputChart;
  readonly failedTransactionRateChart;
  readonly upstreamServicesTable;

  constructor(private readonly page: ScoutPage, private readonly kbnUrl: KibanaUrl) {
    this.latencyChart = this.page.getByTestId('latencyChart');
    this.throughputChart = this.page.getByTestId('throughputChart');
    this.failedTransactionRateChart = this.page.getByTestId('errorRateChart');
    this.upstreamServicesTable = this.page.getByTestId('dependenciesTable');
  }

  async goToPage(overrides?: { dependencyName?: string; rangeFrom?: string; rangeTo?: string }) {
    await this.page.goto(
      `${this.kbnUrl.app('apm')}/dependencies?${new URLSearchParams({
        dependencyName: this.DEPENDENCY_NAME,
        rangeFrom: testData.OPBEANS_START_DATE,
        rangeTo: testData.OPBEANS_END_DATE,
        ...overrides,
      })}`
    );
    await this.page.getByRole('tablist').waitFor();
  }

  // #region Go to Tabs
  private async goToTab(
    tabName: DependencyDetailsPageTabName,
    overrides?: { dependencyName?: string; rangeFrom?: string; rangeTo?: string }
  ) {
    await this.page.goto(
      `${this.kbnUrl.app('apm')}/dependencies/${tabName}?${new URLSearchParams({
        dependencyName: this.DEPENDENCY_NAME,
        rangeFrom: testData.OPBEANS_START_DATE,
        rangeTo: testData.OPBEANS_END_DATE,
        ...overrides,
      })}`
    );
  }

  private async waitForOverviewTabToLoad() {
    await Promise.all([
      waitForChartToLoad(this.page, 'latencyChart'),
      waitForChartToLoad(this.page, 'throughputChart'),
      waitForChartToLoad(this.page, 'errorRateChart'),
      waitForTableToLoad(this.page, 'dependenciesTable'),
    ]);
  }

  async goToOverviewTab(overrides?: {
    dependencyName?: string;
    rangeFrom?: string;
    rangeTo?: string;
  }) {
    await this.goToTab('overview', overrides);
    await this.waitForOverviewTabToLoad();
  }

  private async waitForOperationsTabToLoad() {
    await waitForTableToLoad(this.page, 'apmDependencyDetailOperationsListTable');
  }

  async goToOperationsTab(overrides?: {
    dependencyName?: string;
    rangeFrom?: string;
    rangeTo?: string;
  }) {
    await this.goToTab('operations', overrides);
    await this.waitForOperationsTabToLoad();
  }
  // #endregion

  // #region Get Tabs
  private getTab(tabName: DependencyDetailsPageTabName) {
    return this.page.getByRole('tab', { name: capitalize(tabName) });
  }

  getOverviewTab() {
    return this.getTab('overview');
  }

  getOperationsTab() {
    return this.getTab('operations');
  }
  // #endregion

  // #region Click Tabs
  private async clickTab(tabName: DependencyDetailsPageTabName) {
    await this.getTab(tabName).click();
  }

  async clickOverviewTab() {
    await this.clickTab('overview');
  }

  async clickOperationsTab() {
    await this.clickTab('operations');
  }
  // #endregion

  // #region Overview Tab
  getServiceInUpstreamServicesTable(serviceName: string) {
    return this.upstreamServicesTable.getByRole('link', { name: serviceName });
  }

  async clickServiceInUpstreamServicesTable(serviceName: string) {
    await this.getServiceInUpstreamServicesTable(serviceName).click();
  }
  // #endregion

  // #region Operations Tab
  async expectOperationsTableVisible() {
    await expect(this.page.getByTestId('apmDependencyDetailOperationsListTable')).toBeVisible();
  }

  async expectOperationInOperationsTable(operationName: string) {
    await expect(
      this.page
        .getByTestId(`apmDependencyDetailOperationsListTable`)
        .getByRole('link', { name: operationName })
    ).toBeVisible();
  }

  async clickOperationInOperationsTable(operationName: string) {
    await this.page
      .getByTestId(`apmDependencyDetailOperationsListTable`)
      .getByRole('link', { name: operationName })
      .click();
  }
  // #endregion

  // #region Operation Detail
  private async waitForWaterfallToLoad() {
    this.page
      .getByTestId('apmActionMenuButtonInvestigateButton')
      .getByRole('progressbar')
      .waitFor({ state: 'hidden' });
  }

  private async waitForOperationDetailToLoad() {
    await Promise.all([
      waitForChartToLoad(this.page, 'latencyChart'),
      waitForChartToLoad(this.page, 'throughputChart'),
      waitForChartToLoad(this.page, 'errorRateChart'),
      waitForChartToLoad(this.page, 'apmCorrelationsChart'),
      this.waitForWaterfallToLoad(),
    ]);
  }

  async gotoOperationDetail(params: {
    dependencyName: string;
    spanName: string;
    start: string;
    end: string;
  }) {
    const { dependencyName, spanName, start, end } = params;

    await this.page.goto(
      `${this.kbnUrl.app('apm')}/dependencies/operation?${new URLSearchParams({
        dependencyName,
        spanName,
        rangeFrom: start,
        rangeTo: end,
      })}`
    );
    await this.waitForOperationDetailToLoad();
  }

  async expectCorrelationsChartVisible() {
    await expect(this.page.getByTestId('apmCorrelationsChart')).toBeVisible();
  }

  async expectWaterfallVisible() {
    await expect(this.page.getByTestId('apmActionMenuButtonInvestigateButton')).toBeVisible();
    await expect(this.page.getByTestId('apmFullTraceButtonViewFullTraceButton')).toBeVisible();
  }
  // #endregion
}
