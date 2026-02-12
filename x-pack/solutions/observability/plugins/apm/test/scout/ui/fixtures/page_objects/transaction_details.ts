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

  async reload() {
    await this.page.reload();
    await waitForApmSettingsHeaderLink(this.page);
  }

  async fillApmUnifiedSearchBar(query: string) {
    const searchBar = this.page.getByTestId('apmUnifiedSearchBar');
    await searchBar.fill(query);
    await searchBar.press('Enter');
  }
}
