/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout-oblt';
import { EXTENDED_TIMEOUT } from '../constants';

export class CorrelationsPage {
  constructor(private readonly page: ScoutPage) {}

  public get latencyTabButton() {
    return this.page.getByTestId('apmLatencyCorrelationsTabButton');
  }

  public get latencyTabContent() {
    return this.page.getByTestId('apmLatencyCorrelationsTabContent');
  }

  public get failedTransactionsTabButton() {
    return this.page.getByTestId('apmFailedTransactionsCorrelationsTabButton');
  }

  public get failedTransactionsTabContent() {
    return this.page.getByTestId('apmFailedTransactionsCorrelationsTabContent');
  }

  public get correlationsTable() {
    return this.page.getByTestId('apmCorrelationsTable');
  }

  async waitForProgressComplete() {
    await this.page
      .getByTestId('apmCorrelationsProgress_100')
      .waitFor({ state: 'visible', timeout: EXTENDED_TIMEOUT });
  }
}
