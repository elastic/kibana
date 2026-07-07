/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaUrl, ScoutPage } from '@kbn/scout-oblt';
import { EXTENDED_TIMEOUT } from '../constants';

export class NavigationPage {
  constructor(private readonly page: ScoutPage, private readonly kbnUrl: KibanaUrl) {}

  async gotoHome() {
    await this.page.goto(this.kbnUrl.app('home'));
  }

  async gotoApm(path: string = '') {
    await this.page.goto(`${this.kbnUrl.app('apm')}${path}`);
  }

  async gotoServiceOverview(serviceName: string, query: Record<string, string> = {}) {
    await this.page.goto(
      `${this.kbnUrl.app('apm')}/services/${serviceName}/overview?${new URLSearchParams(query)}`
    );
  }

  public get globalSearchInput() {
    return this.page.getByTestId('nav-search-input');
  }

  // In serverless (project chrome style) the search input starts collapsed
  // behind a reveal button and is only rendered once clicked. In classic
  // chrome style the input is always rendered, so this button never appears.
  public get globalSearchRevealButton() {
    return this.page.getByTestId('nav-search-reveal');
  }

  async searchGlobalNav(keyword: string) {
    // The input and reveal button are mutually exclusive, so at most one of
    // them is rendered at any given time.
    await this.globalSearchInput
      .or(this.globalSearchRevealButton)
      .waitFor({ state: 'visible', timeout: EXTENDED_TIMEOUT });

    if (await this.globalSearchRevealButton.isVisible()) {
      await this.globalSearchRevealButton.click();
    }

    await this.globalSearchInput.waitFor({ state: 'visible', timeout: EXTENDED_TIMEOUT });
    await this.globalSearchInput.fill(keyword);
  }

  getSearchResult(title: string) {
    return this.page.getByTestId('euiSelectableList').getByText(title, { exact: true });
  }

  async clickSearchResult(title: string) {
    const result = this.getSearchResult(title);
    await result.scrollIntoViewIfNeeded();
    await result.click();
  }
}
