/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { WebElementWrapper } from '@kbn/ftr-common-functional-ui-services';
import { FtrService } from '../ftr_provider_context';

interface SearchResult {
  label: string;
}

export class NavigationalSearchPageObject extends FtrService {
  private readonly find = this.ctx.getService('find');
  private readonly testSubjects = this.ctx.getService('testSubjects');
  private readonly common = this.ctx.getPageObject('common');

  async focus() {
    const field = await this.testSubjects.find('nav-search-input');
    await field.click();
  }

  async blur() {
    await this.testSubjects.click('helpMenuButton');
    await this.testSubjects.click('helpMenuButton');
    await this.find.waitForDeletedByCssSelector('.navSearch__panel');
  }

  async searchFor(
    term: string,
    { clear = true, wait = true }: { clear?: boolean; wait?: boolean } = {}
  ) {
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
    return await this.find.existsByCssSelector('.navSearch__panel');
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
