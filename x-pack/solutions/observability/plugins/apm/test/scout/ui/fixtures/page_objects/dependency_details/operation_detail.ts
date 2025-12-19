/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaUrl, Locator, ScoutPage } from '@kbn/scout-oblt';
import { subj } from '@kbn/test-subj-selector';
import { testData } from '../..';
import { waitForChartToLoad } from '../utils';

export class OperationDetailSubpage {
  readonly breadcrumb: Locator;
  readonly latencyChart: Locator;
  readonly throughputChart: Locator;
  readonly failedTransactionRateChart: Locator;
  readonly correlationsChart: Locator;
  readonly waterfallInvestigateButton: Locator;
  readonly waterfallInvestigatePopup: Locator;
  readonly waterfallPaginationLastButton: Locator;
  readonly waterfallSpanLinksBadge: Locator;

  constructor(
    private readonly page: ScoutPage,
    private readonly kbnUrl: KibanaUrl,
    private readonly defaultDependencyName: string,
    private readonly defaultSpanName: string
  ) {
    this.breadcrumb = this.page.getByTestId('apmDetailViewHeaderLink');
    this.latencyChart = this.page.getByTestId('latencyChart');
    this.throughputChart = this.page.getByTestId('throughputChart');
    this.failedTransactionRateChart = this.page.getByTestId('errorRateChart');
    this.correlationsChart = this.page.getByTestId('apmCorrelationsChart');
    this.waterfallInvestigateButton = this.page.getByTestId('apmActionMenuButtonInvestigateButton');
    this.waterfallInvestigatePopup = this.page.getByTestId('apmActionMenuInvestigateButtonPopup');
    this.waterfallPaginationLastButton = this.page.getByTestId('pagination-button-last');
    this.waterfallSpanLinksBadge = this.page.locator(subj('^spanLinksBadge_'));
  }

  private async waitForWaterfallToLoad() {
    this.waterfallInvestigateButton.getByRole('progressbar').waitFor({ state: 'hidden' });
  }

  private async waitForOperationDetailToLoad() {
    await Promise.all([
      waitForChartToLoad(this.page, this.latencyChart),
      waitForChartToLoad(this.page, this.throughputChart),
      waitForChartToLoad(this.page, this.failedTransactionRateChart),
      waitForChartToLoad(this.page, this.correlationsChart),
      this.waitForWaterfallToLoad(),
    ]);
  }

  public async goToPage(
    overrides: {
      dependencyName?: string;
      spanName?: string;
      rangeFrom?: string;
      rangeTo?: string;
    } = {}
  ) {
    await this.page.goto(
      `${this.kbnUrl.app('apm')}/dependencies/operation?${new URLSearchParams({
        dependencyName: this.defaultDependencyName,
        spanName: this.defaultSpanName,
        rangeFrom: testData.OPBEANS_START_DATE,
        rangeTo: testData.OPBEANS_END_DATE,
        ...overrides,
      })}`
    );
    await this.waitForOperationDetailToLoad();
  }
}
