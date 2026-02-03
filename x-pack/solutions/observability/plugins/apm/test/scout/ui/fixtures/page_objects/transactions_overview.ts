/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaUrl, ScoutPage } from '@kbn/scout-oblt';
import { EXTENDED_TIMEOUT } from '../constants';

export class TransactionsOverviewPage {
  constructor(private readonly page: ScoutPage, private readonly kbnUrl: KibanaUrl) {}

  async goto(serviceName: string, rangeFrom: string, rangeTo: string) {
    await this.page.goto(
      `${this.kbnUrl.app(
        'apm'
      )}/services/${serviceName}/transactions?rangeFrom=${rangeFrom}&rangeTo=${rangeTo}`,
      { timeout: EXTENDED_TIMEOUT }
    );
    await this.page
      .getByTestId('apmMainTemplateHeaderServiceName')
      .waitFor({ timeout: EXTENDED_TIMEOUT });
  }

  getTransactionTypeFilter() {
    return this.page.testSubj.locator('headerFilterTransactionType');
  }

  async selectTransactionType(type: string) {
    const filter = this.getTransactionTypeFilter();
    await filter.selectOption(type);
  }
}
