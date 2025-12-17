/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaUrl, ScoutPage } from '@kbn/scout-oblt';
import { capitalize } from 'lodash';
import { expect } from '@kbn/scout-oblt';
import { waitForChartToLoad, waitForTableToLoad } from './utils';
import { testData } from '..';

type DependencyDetailsPageTabName = 'overview' | 'operations';

export class DependencyDetailsPage {
  readonly DEPENDENCY_NAME = 'postgresql';

  constructor(private readonly page: ScoutPage, private readonly kbnUrl: KibanaUrl) {}

  async gotoPage(overrides?: { dependencyName?: string; rangeFrom?: string; rangeTo?: string }) {
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
  private async gotoTab(
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

  async gotoOverviewTab(overrides?: {
    dependencyName?: string;
    rangeFrom?: string;
    rangeTo?: string;
  }) {
    await this.gotoTab('overview', overrides);
    await this.waitForOverviewTabToLoad();
  }

  private async waitForOperationsTabToLoad() {
    await waitForTableToLoad(this.page, 'apmDependencyDetailOperationsListTable');
  }

  async gotoOperationsTab(overrides?: {
    dependencyName?: string;
    rangeFrom?: string;
    rangeTo?: string;
  }) {
    await this.gotoTab('operations', overrides);
    await this.waitForOperationsTabToLoad();
  }
  // #endregion

  // #region Click Tabs
  private async clickTab(tabName: DependencyDetailsPageTabName) {
    await this.page.getByRole('tab', { name: capitalize(tabName) }).click();
  }

  async clickOverviewTab() {
    await this.clickTab('overview');
  }

  async clickOperationsTab() {
    await this.clickTab('operations');
  }
  // #endregion

  // #region Expect Tabs Visible
  private async expectTabVisible(tabName: DependencyDetailsPageTabName) {
    await expect(this.page.getByRole('tab', { name: capitalize(tabName) })).toBeVisible();
  }

  async expectOverviewTabVisible() {
    await this.expectTabVisible('overview');
  }

  async expectOperationsTabVisible() {
    await this.expectTabVisible('operations');
  }
  // #endregion

  // #region Expect Tabs Selected
  private async expectTabSelected(tabName: DependencyDetailsPageTabName) {
    await expect(this.page.getByRole('tab', { name: capitalize(tabName) })).toHaveAttribute(
      'aria-selected',
      'true'
    );
  }

  async expectOverviewTabSelected() {
    await this.expectTabSelected('overview');
  }

  async expectOperationsTabSelected() {
    await this.expectTabSelected('operations');
  }
  // #endregion

  // #region Overview Tab
  async expectLatencyChartVisible() {
    await expect(this.page.getByTestId('latencyChart')).toBeVisible();
  }

  async expectThroughputChartVisible() {
    await expect(this.page.getByTestId('throughputChart')).toBeVisible();
  }

  async expectFailedTransactionRateChartVisible() {
    await expect(this.page.getByTestId('errorRateChart')).toBeVisible();
  }

  async expectUpstreamServicesTableVisible() {
    await expect(this.page.getByTestId('dependenciesTable')).toBeVisible();
    await expect(this.page.getByRole('heading', { name: 'Upstream services' })).toBeVisible();
  }

  async expectServiceInUpstreamServicesTable(serviceName: string) {
    await expect(this.page.getByRole('link', { name: serviceName })).toBeVisible();
  }

  async clickServiceInUpstreamServicesTable(serviceName: string) {
    await this.page.getByRole('link', { name: serviceName }).click();
  }
  // #endregion
}
