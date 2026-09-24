/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SolutionNavigationProvider } from '@kbn/test-suites-src/functional/page_objects';
import { CHROME_HEADER_TEST_SUBJECTS } from '@kbn/core-chrome-browser-components';

import { NavigationalSearchPageObject } from '../../../functional/page_objects/navigational_search';
import type { FtrProviderContext } from '../ftr_provider_context';

export function SvlCommonNavigationProvider(ctx: FtrProviderContext) {
  const solutionNavigation = SolutionNavigationProvider(ctx);

  return {
    ...solutionNavigation,
    search: new SvlNavigationSearchPageObject(ctx),
  };
}

const SEARCH_BUTTON = CHROME_HEADER_TEST_SUBJECTS.searchButton;
const SEARCH_MODAL = 'globalSearchModal';

class SvlNavigationSearchPageObject extends NavigationalSearchPageObject {
  constructor(ctx: FtrProviderContext) {
    // @ts-expect-error -- this expects FtrProviderContext from x-pack/platform/test/functional/ftr_provider_context.ts
    super(ctx);
  }

  async showSearch() {
    const testSubjects = this.ctx.getService('testSubjects');
    if (await testSubjects.exists(SEARCH_MODAL)) return;
    await testSubjects.click(SEARCH_BUTTON);
    await testSubjects.existOrFail(SEARCH_MODAL);
  }

  async hideSearch() {
    const testSubjects = this.ctx.getService('testSubjects');
    const browser = this.ctx.getService('browser');
    if (await testSubjects.exists(SEARCH_MODAL)) {
      // The open modal renders an overlay mask above the header, which intercepts clicks
      // on the search button. Press Escape to close the modal instead.
      // (Selecting a result already closes the modal, so this only runs if still open.)
      await browser.pressKeys(browser.keys.ESCAPE);
      await testSubjects.missingOrFail(SEARCH_MODAL);
    }
  }
}
