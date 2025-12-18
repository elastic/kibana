/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaUrl, ScoutPage } from '@kbn/scout-oblt';
import { capitalize } from 'lodash';
import { subj } from '@kbn/test-subj-selector';
import { waitForChartToLoad, waitForTableToLoad } from './utils';
import { testData } from '..';

type DependencyDetailsPageTabName = 'overview' | 'operations';

export class DependencyDetailsPage {
  readonly DEPENDENCY_NAME = 'postgresql';
  readonly SPAN_NAME = 'SELECT * FROM product';

  readonly overviewTabLatencyChart;
  readonly overviewTabThroughputChart;
  readonly overviewTabFailedTransactionRateChart;
  readonly overviewTabUpstreamServicesTable;

  readonly operationsTabOperationsTable;

  readonly operationDetailBreadcrumb;
  readonly operationDetailLatencyChart;
  readonly operationDetailThroughputChart;
  readonly operationDetailFailedTransactionRateChart;
  readonly operationDetailCorrelationsChart;
  readonly operationDetailWaterfallInvestigateButton;
  readonly operationDetailWaterfallInvestigatePopup;
  readonly operationDetailWaterfallPaginationLastButton;
  readonly operationDetailWaterfallSpanLinksBadge;

  constructor(private readonly page: ScoutPage, private readonly kbnUrl: KibanaUrl) {
    this.overviewTabLatencyChart = this.page.getByTestId('latencyChart');
    this.overviewTabThroughputChart = this.page.getByTestId('throughputChart');
    this.overviewTabFailedTransactionRateChart = this.page.getByTestId('errorRateChart');
    this.overviewTabUpstreamServicesTable = this.page.getByTestId('dependenciesTable');

    this.operationsTabOperationsTable = this.page.getByTestId(
      'apmDependencyDetailOperationsListTable'
    );

    this.operationDetailBreadcrumb = this.page.getByTestId('apmDetailViewHeaderLink');
    this.operationDetailLatencyChart = this.page.getByTestId('latencyChart');
    this.operationDetailThroughputChart = this.page.getByTestId('throughputChart');
    this.operationDetailFailedTransactionRateChart = this.page.getByTestId('errorRateChart');
    this.operationDetailCorrelationsChart = this.page.getByTestId('apmCorrelationsChart');
    this.operationDetailWaterfallInvestigateButton = this.page.getByTestId(
      'apmActionMenuButtonInvestigateButton'
    );
    this.operationDetailWaterfallInvestigatePopup = this.page.getByTestId(
      'apmActionMenuInvestigateButtonPopup'
    );
    this.operationDetailWaterfallPaginationLastButton =
      this.page.getByTestId('pagination-button-last');
    this.operationDetailWaterfallSpanLinksBadge = this.page.locator(subj('^spanLinksBadge_'));
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
  getServiceInOverviewTabUpstreamServicesTable(serviceName: string) {
    return this.overviewTabUpstreamServicesTable.getByRole('link', { name: serviceName });
  }

  async clickServiceInOverviewTabUpstreamServicesTable(serviceName: string) {
    await this.getServiceInOverviewTabUpstreamServicesTable(serviceName).click();
  }
  // #endregion

  // #region Operations Tab
  getOperationInOperationsTabOperationsTable(operationName: string) {
    return this.operationsTabOperationsTable.getByRole('link', { name: operationName });
  }

  async clickOperationInOperationsTable(operationName: string) {
    await this.getOperationInOperationsTabOperationsTable(operationName).click();
  }
  // #endregion

  // #region Operation Detail
  private async waitForWaterfallToLoad() {
    this.operationDetailWaterfallInvestigateButton
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

  async gotoOperationDetail(
    overrides: {
      dependencyName?: string;
      spanName?: string;
      rangeFrom?: string;
      rangeTo?: string;
    } = {}
  ) {
    await this.page.goto(
      `${this.kbnUrl.app('apm')}/dependencies/operation?${new URLSearchParams({
        dependencyName: this.DEPENDENCY_NAME,
        spanName: this.SPAN_NAME,
        rangeFrom: testData.OPBEANS_START_DATE,
        rangeTo: testData.OPBEANS_END_DATE,
        ...overrides,
      })}`
    );
    await this.waitForOperationDetailToLoad();
  }
  // #endregion
}
