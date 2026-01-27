/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaUrl, Locator, ScoutPage } from '@kbn/scout-oblt';
import { waitForApmSettingsHeaderLink } from '../page_helpers';

export class StorageExplorerPage {
  public storageChart: Locator;
  public pageTitle: Locator;
  public servicesTableLoadedIndicator: Locator;
  constructor(private readonly page: ScoutPage, private readonly kbnUrl: KibanaUrl) {
    this.storageChart = this.page.testSubj.locator('storageExplorerTimeseriesChart');
    this.pageTitle = this.page.getByRole('heading', { name: 'Storage explorer', level: 1 });
    this.servicesTableLoadedIndicator = this.page.testSubj.locator(
      'storageExplorerServicesTable-loaded'
    );
  }

  async goto() {
    await this.page.goto(
      `${this.kbnUrl.app(
        'apm'
      )}/storage-explorer?rangeFrom=now-24h&rangeTo=now&environment=ENVIRONMENT_ALL&indexLifecyclePhase=all`
    );
    return await waitForApmSettingsHeaderLink(this.page);
  }

  async gotoWithTimeRange(rangeFrom: string, rangeTo: string) {
    await this.page.goto(
      `${this.kbnUrl.app(
        'apm'
      )}/storage-explorer?rangeFrom=${rangeFrom}&rangeTo=${rangeTo}&environment=ENVIRONMENT_ALL&indexLifecyclePhase=all`
    );
    return await waitForApmSettingsHeaderLink(this.page);
  }

  // Summary stats methods

  async getSummaryStatTitleElements() {
    const titles = [
      'Total APM size',
      'Relative disk space used',
      'Delta in APM size',
      'Daily data generation',
      'Traces per minute',
      'Number of services',
    ];

    const elements = titles.map((title) => this.page.getByText(title));

    return elements;
  }

  // Wait for the services table to finish loading
  async waitForServicesTableLoaded() {
    await this.servicesTableLoadedIndicator.waitFor({ state: 'attached' });
  }
}
