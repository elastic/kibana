/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaUrl, ScoutPage } from '@kbn/scout-oblt';
import { testData } from '..';
import { EXTENDED_TIMEOUT } from '../constants';

export class MobileTransactionsPage {
  constructor(private readonly page: ScoutPage, private readonly kbnUrl: KibanaUrl) {}

  async gotoTransactions(
    serviceName: string,
    overrides: { rangeFrom?: string; rangeTo?: string } = {}
  ) {
    await this.page.goto(
      `${this.kbnUrl.app('apm')}/mobile-services/${encodeURIComponent(
        serviceName
      )}/transactions?${new URLSearchParams({
        rangeFrom: overrides.rangeFrom ?? testData.START_DATE,
        rangeTo: overrides.rangeTo ?? testData.END_DATE,
      })}`
    );
    await this.page
      .getByTestId('querySubmitButton')
      .waitFor({ state: 'visible', timeout: EXTENDED_TIMEOUT });
  }

  async gotoTransactionDetails(
    serviceName: string,
    transactionName: string,
    overrides: { rangeFrom?: string; rangeTo?: string } = {}
  ) {
    await this.page.goto(
      `${this.kbnUrl.app('apm')}/mobile-services/${encodeURIComponent(
        serviceName
      )}/transactions/view?${new URLSearchParams({
        rangeFrom: overrides.rangeFrom ?? testData.START_DATE,
        rangeTo: overrides.rangeTo ?? testData.END_DATE,
        transactionName,
      })}`
    );
  }

  getTab(testSubj: string) {
    return this.page.getByTestId(testSubj);
  }

  async clickTab(testSubj: string) {
    await this.getTab(testSubj).click();
  }

  public get investigateButton() {
    return this.page.getByTestId('apmActionMenuButtonInvestigateButton');
  }

  public get investigatePopup() {
    return this.page.getByTestId('apmActionMenuInvestigateButtonPopup');
  }
}
