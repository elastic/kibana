/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaUrl, Locator, ScoutPage } from '@kbn/scout-oblt';
import capitalize from 'lodash/capitalize';
import type { DependencyDetailsPageTabName } from './dependency_details_tab';
import { DependencyDetailsTab } from './dependency_details_tab';
import { waitForChartToLoad, waitForTableToLoad } from '../utils';

export class OverviewTab extends DependencyDetailsTab {
  public readonly tabName: DependencyDetailsPageTabName = 'overview';
  public readonly tab: Locator;

  public readonly latencyChart: Locator;
  public readonly throughputChart: Locator;
  public readonly failedTransactionRateChart: Locator;
  public readonly upstreamServicesTable: Locator;

  constructor(page: ScoutPage, kbnUrl: KibanaUrl, defaultDependencyName: string) {
    super(page, kbnUrl, defaultDependencyName);
    this.tab = this.page.getByRole('tab', { name: capitalize(this.tabName) });
    this.latencyChart = this.page.getByTestId('latencyChart');
    this.throughputChart = this.page.getByTestId('throughputChart');
    this.failedTransactionRateChart = this.page.getByTestId('errorRateChart');
    this.upstreamServicesTable = this.page.getByTestId('dependenciesTable');
  }

  protected async waitForTabLoad() {
    await Promise.all([
      waitForChartToLoad(this.page, this.latencyChart),
      waitForChartToLoad(this.page, this.throughputChart),
      waitForChartToLoad(this.page, this.failedTransactionRateChart),
      waitForTableToLoad(this.page, this.upstreamServicesTable),
    ]);
  }

  public getServiceInUpstreamServicesTable(serviceName: string) {
    return this.upstreamServicesTable.getByRole('link', { name: serviceName });
  }

  public async clickServiceInUpstreamServicesTable(serviceName: string) {
    await this.getServiceInUpstreamServicesTable(serviceName).click();
  }
}
