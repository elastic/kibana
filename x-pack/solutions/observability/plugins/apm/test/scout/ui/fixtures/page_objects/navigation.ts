/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaUrl, ScoutPage } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { EXTENDED_TIMEOUT } from '../constants';

export class NavigationPage {
  constructor(private readonly page: ScoutPage, private readonly kbnUrl: KibanaUrl) {}

  async gotoHome() {
    await this.page.goto(this.kbnUrl.app('home'));
    await this.globalSearchInput
      .or(this.globalSearchRevealButton)
      .waitFor({ state: 'visible', timeout: EXTENDED_TIMEOUT });
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
    await this.waitForSearchResults();
  }

  private get virtualizedSearchList() {
    return this.page.locator('.navSearch__panel .euiSelectableList__list');
  }

  private async waitForSearchResults() {
    await this.page.getByTestId('nav-search-option').first().waitFor({
      state: 'attached',
      timeout: EXTENDED_TIMEOUT,
    });

    const loadingSpinner = this.page.locator('.navSearch__panel .euiLoadingSpinner');
    if ((await loadingSpinner.count()) > 0) {
      await loadingSpinner.waitFor({ state: 'hidden', timeout: EXTENDED_TIMEOUT });
    }
  }

  getSearchResult(title: string) {
    return this.page.getByTestId('nav-search-option').filter({
      has: this.page.locator('.euiSelectableTemplateSitewide__listItemTitle', {
        hasText: title,
      }),
    });
  }

  private async scrollUntilSearchResultRendered(title: string) {
    const result = this.getSearchResult(title);
    const list = this.virtualizedSearchList;

    await expect(async () => {
      if ((await result.count()) > 0) {
        return;
      }

      const canScrollFurther = await list.evaluate((element) => {
        const previousTop = element.scrollTop;
        element.scrollTop += element.clientHeight;
        return element.scrollTop !== previousTop;
      });

      if (!canScrollFurther) {
        throw new Error(`Search result "${title}" was not found in the virtualized list`);
      }

      throw new Error(`Search result "${title}" is not rendered yet`);
    }).toPass({ timeout: EXTENDED_TIMEOUT });
  }

  async clickSearchResult(title: string) {
    await this.scrollUntilSearchResultRendered(title);
    await this.getSearchResult(title).first().click();
  }
}
