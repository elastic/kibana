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

export class TransactionsTab extends ServiceDetailsTab {
  public readonly tabName: ServiceDetailsPageTabName = 'transactions';
  public readonly tab: Locator;

  public readonly transactionsGroupTable: Locator;

  constructor(page: ScoutPage, kbnUrl: KibanaUrl, defaultServiceName: string) {
    super(page, kbnUrl, defaultServiceName);
    this.tab = this.page.getByTestId(`${this.tabName}Tab`);
    this.transactionsGroupTable = this.page.getByTestId('transactionsGroupTable');
  }

  protected async waitForTabLoad(): Promise<void> {
    await this.page
      .getByRole('heading', { name: 'Transactions', exact: true })
      .waitFor({ state: 'visible', timeout: EXTENDED_TIMEOUT });
  }

  // #region Transactions Table
  getTransactionsTable() {
    return this.transactionsGroupTable;
  }

  getTransactionLink(transactionName: string) {
    return this.transactionsGroupTable.getByRole('link', { name: transactionName });
  }

  async clickTransactionLink(transactionName: string) {
    await this.getTransactionLink(transactionName).click();
  }
  // #endregion
}
