/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaUrl, ScoutPage } from '@kbn/scout-oblt';

export class StorageExplorerPage {
  constructor(private readonly page: ScoutPage, private readonly kbnUrl: KibanaUrl) {}

  async goto() {
    await this.page.goto(
      `${this.kbnUrl.app(
        'apm'
      )}/storage-explorer?rangeFrom=now-24h&rangeTo=now&environment=ENVIRONMENT_ALL&indexLifecyclePhase=all`
    );
    await this.page.waitForLoadingIndicatorHidden();

    // Wait for either the storage explorer page or permission denied page
    try {
      await this.page
        .getByRole('heading', { name: 'Storage explorer', level: 1 })
        .waitFor({ timeout: 10000 });
    } catch (error) {
      // Check if it's a permission denied page instead
      const permissionText = this.page.getByText('You need permission');
      if (await permissionText.isVisible()) {
        return this.page;
      }
      throw error;
    }

    return this.page;
  }

  async gotoWithTimeRange(rangeFrom: string, rangeTo: string) {
    await this.page.goto(
      `${this.kbnUrl.app(
        'apm'
      )}/storage-explorer?rangeFrom=${rangeFrom}&rangeTo=${rangeTo}&environment=ENVIRONMENT_ALL&indexLifecyclePhase=all`
    );
    await this.page.waitForLoadingIndicatorHidden();
    return this.page;
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

    const visibleElements = [];
    for (const title of titles) {
      const element = this.page.getByText(title);
      visibleElements.push(element);
    }
    return visibleElements;
  }

  // Chart methods
  async getStorageChart() {
    return this.page.getByTestId('storageExplorerTimeseriesChart');
  }
}
