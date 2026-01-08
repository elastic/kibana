/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaUrl, ScoutPage } from '@kbn/scout-oblt';
import { waitForApmSettingsHeaderLink } from '../page_helpers';

export class TransactionDetailsPage {
  constructor(private readonly page: ScoutPage, private readonly kbnUrl: KibanaUrl) {}

  async goToTransactionDetails(params: {
    serviceName: string;
    transactionName: string;
    start: string;
    end: string;
  }) {
    const { serviceName, transactionName, start, end } = params;
    const urlServiceName = encodeURIComponent(serviceName);

    await this.page.goto(
      `${this.kbnUrl.app('apm')}/services/${urlServiceName}/transactions/view?${new URLSearchParams(
        {
          transactionName,
          rangeFrom: start,
          rangeTo: end,
        }
      )}`
    );
    await waitForApmSettingsHeaderLink(this.page);
  }

  /**
   * Navigate to service inventory page
   */
  async gotoServiceInventory(
    serviceName: string,
    timeRange: { rangeFrom: string; rangeTo: string }
  ) {
    const urlServiceName = encodeURIComponent(serviceName);

    await this.page.goto(
      `${this.kbnUrl.app('apm')}/services/${urlServiceName}?${new URLSearchParams({
        rangeFrom: timeRange.rangeFrom,
        rangeTo: timeRange.rangeTo,
        environment: 'ENVIRONMENT_ALL',
        kuery: '',
        serviceGroup: '',
        transactionType: 'request',
        comparisonEnabled: 'true',
        offset: '1d',
      })}`
    );
    await waitForApmSettingsHeaderLink(this.page);
  }

  async reload() {
    await this.page.reload();
    await waitForApmSettingsHeaderLink(this.page);
  }

  async fillApmUnifiedSearchBar(query: string) {
    const searchBar = this.page.getByTestId('apmUnifiedSearchBar');
    await searchBar.fill(query);
    await searchBar.press('Enter');
  }

  // Span links methods

  /**
   * Get span links tab in flyout
   */
  getSpanLinksTab() {
    return this.page.getByTestId('spanLinksTab');
  }

  /**
   * Get span link type select dropdown
   */
  getSpanLinkTypeSelect() {
    return this.page.getByTestId('spanLinkTypeSelect');
  }

  // Stacktrace methods

  /**
   * Get stacktrace tab in flyout
   */
  getStacktraceTab() {
    return this.page.getByTestId('spanStacktraceTab');
  }

  // Transaction interaction methods

  /**
   * Click transaction accordion button using aria-controls selector
   */
  async clickTransactionWithAriaControls(transactionId: string) {
    await this.page.locator(`[aria-controls="${transactionId}"]`).click();
  }
}
