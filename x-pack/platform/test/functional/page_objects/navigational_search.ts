/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WebElementWrapper } from '@kbn/ftr-common-functional-ui-services';
import { FtrService } from '../ftr_provider_context';

interface SearchResult {
  label: string;
}

const SEARCH_BUTTON = 'chromeNextGlobalHeaderSearchButton';
const SEARCH_MODAL = 'chromeNextSearchModal';

export class NavigationalSearchPageObject extends FtrService {
  private readonly find = this.ctx.getService('find');
  private readonly testSubjects = this.ctx.getService('testSubjects');
  private readonly common = this.ctx.getPageObject('common');
  private readonly browser = this.ctx.getService('browser');

  async ensureSearchOpen() {
    // Poll the modal-open read so a transient re-render of the already-open modal isn't misread as
    // closed, which would click SEARCH_BUTTON — a toggle hidden under the modal's own overlay mask.
    if (await this.testSubjects.exists(SEARCH_MODAL, { timeout: 2500 })) {
      return;
    }
    await this.testSubjects.click(SEARCH_BUTTON);
    await this.testSubjects.existOrFail(SEARCH_MODAL);
  }

  async focus() {
    await this.ensureSearchOpen();
    const field = await this.testSubjects.find('nav-search-input');
    await field.click();
  }

  async blur() {
    if (!(await this.testSubjects.exists(SEARCH_MODAL, { timeout: 0 }))) {
      return;
    }
    await this.browser.pressKeys(this.browser.keys.ESCAPE);
    await this.testSubjects.missingOrFail(SEARCH_MODAL);
  }

  async searchFor(
    term: string,
    { clear = true, wait = true }: { clear?: boolean; wait?: boolean } = {}
  ) {
    await this.ensureSearchOpen();
    if (clear) {
      await this.clearField();
    }
    const field = await this.testSubjects.find('nav-search-input');
    await field.type(term);
    if (wait) {
      await this.waitForResultsLoaded();
    }
  }

  async getFieldValue() {
    const field = await this.testSubjects.find('nav-search-input');
    return field.getAttribute('value');
  }

  async clearField() {
    const field = await this.testSubjects.find('nav-search-input');
    await field.clearValueWithKeyboard();
  }

  async isPopoverDisplayed() {
    return await this.testSubjects.exists(SEARCH_MODAL, { timeout: 0 });
  }

  async clickOnOption(index: number) {
    const options = await this.testSubjects.findAll('nav-search-option');
    await options[index].click();
  }

  async waitForResultsLoaded(waitUntil: number = 3000) {
    await this.testSubjects.exists('nav-search-option');
    // results are emitted in multiple batches. Each individual batch causes a re-render of
    // the component, causing the current elements to become stale. We can't perform DOM access
    // without heavy flakiness in this situation.
    // there is NO ui indication of any kind to detect when all the emissions are done,
    // so we are forced to fallback to awaiting a given amount of time once the first options are displayed.
    await this.common.sleep(waitUntil);
  }

  async getDisplayedResults() {
    const resultElements = await this.testSubjects.findAll('nav-search-option');
    return Promise.all(resultElements.map((el) => this.convertResultElement(el)));
  }

  async isNoResultsPlaceholderDisplayed(checkAfter: number = 3000) {
    // see comment in `waitForResultsLoaded`
    await this.common.sleep(checkAfter);
    return this.testSubjects.exists('nav-search-no-results');
  }

  private async convertResultElement(resultEl: WebElementWrapper): Promise<SearchResult> {
    const labelEl = await this.find.allDescendantDisplayedByCssSelector(
      '.euiSelectableTemplateSitewide__listItemTitle',
      resultEl
    );
    const label = await labelEl[0].getVisibleText();

    return {
      label,
    };
  }
}
