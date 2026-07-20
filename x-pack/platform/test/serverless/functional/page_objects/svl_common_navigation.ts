/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SolutionNavigationProvider } from '@kbn/test-suites-src/functional/page_objects';

import { NavigationalSearchPageObject } from '../../../functional/page_objects/navigational_search';
import type { FtrProviderContext } from '../ftr_provider_context';

export function SvlCommonNavigationProvider(ctx: FtrProviderContext) {
  const solutionNavigation = SolutionNavigationProvider(ctx);

  return {
    ...solutionNavigation,
    search: new SvlNavigationSearchPageObject(ctx),
  };
}

// chrome-next opens global search in an overlay modal toggled by a header button; classic chrome
// reveals an inline popover. These helpers support both so they work regardless of chrome-next.
// Input and result handling are inherited from the base page object.
const CHROME_NEXT_SEARCH_BUTTON = 'chromeNextGlobalHeaderSearchButton';
const CHROME_NEXT_SEARCH_MODAL = 'chromeNextSearchModal';
const CLASSIC_SEARCH_REVEAL = 'nav-search-reveal';
const CLASSIC_SEARCH_CONCEAL = 'nav-search-conceal';

class SvlNavigationSearchPageObject extends NavigationalSearchPageObject {
  constructor(ctx: FtrProviderContext) {
    // @ts-expect-error -- this expects FtrProviderContext from x-pack/platform/test/functional/ftr_provider_context.ts
    super(ctx);
  }

  async showSearch() {
    const testSubjects = this.ctx.getService('testSubjects');
    const retry = this.ctx.getService('retry');
    const isChromeNext = await retry.try(async () => {
      if (await testSubjects.exists(CHROME_NEXT_SEARCH_BUTTON, { timeout: 0 })) {
        return true;
      }
      if (await testSubjects.exists(CLASSIC_SEARCH_REVEAL, { timeout: 0 })) {
        return false;
      }
      throw new Error('No global search trigger is present');
    });

    if (isChromeNext) {
      if (await testSubjects.exists(CHROME_NEXT_SEARCH_MODAL, { timeout: 0 })) return;
      await testSubjects.click(CHROME_NEXT_SEARCH_BUTTON);
      await testSubjects.existOrFail(CHROME_NEXT_SEARCH_MODAL);
      return;
    }
    await testSubjects.click(CLASSIC_SEARCH_REVEAL);
  }

  async hideSearch() {
    const testSubjects = this.ctx.getService('testSubjects');
    const browser = this.ctx.getService('browser');
    if (await testSubjects.exists(CHROME_NEXT_SEARCH_MODAL, { timeout: 0 })) {
      // The open modal renders an overlay mask above the header, which intercepts clicks
      // on the search button. Press Escape to close the modal instead.
      // (Selecting a result already closes the modal, so this only runs if still open.)
      await browser.pressKeys(browser.keys.ESCAPE);
      await testSubjects.missingOrFail(CHROME_NEXT_SEARCH_MODAL);
      return;
    }
    if (await testSubjects.exists(CLASSIC_SEARCH_CONCEAL, { timeout: 0 })) {
      await testSubjects.click(CLASSIC_SEARCH_CONCEAL);
    }
  }
}
