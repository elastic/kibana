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

// Serverless always runs chrome-next, where global search opens in an overlay modal toggled
// by a header button. Input and result handling are inherited from the base page object.
const CHROME_NEXT_SEARCH_BUTTON = 'chromeNextGlobalHeaderSearchButton';
const CHROME_NEXT_SEARCH_MODAL = 'chromeNextSearchModal';

class SvlNavigationSearchPageObject extends NavigationalSearchPageObject {
  constructor(ctx: FtrProviderContext) {
    // @ts-expect-error -- this expects FtrProviderContext from x-pack/platform/test/functional/ftr_provider_context.ts
    super(ctx);
  }

  async showSearch() {
    const testSubjects = this.ctx.getService('testSubjects');
    if (await testSubjects.exists(CHROME_NEXT_SEARCH_MODAL, { timeout: 0 })) return;
    await testSubjects.click(CHROME_NEXT_SEARCH_BUTTON);
    await testSubjects.existOrFail(CHROME_NEXT_SEARCH_MODAL);
  }

  async hideSearch() {
    const testSubjects = this.ctx.getService('testSubjects');
    // Selecting a result already closes the modal, so only toggle it shut if still open.
    if (await testSubjects.exists(CHROME_NEXT_SEARCH_MODAL, { timeout: 0 })) {
      await testSubjects.click(CHROME_NEXT_SEARCH_BUTTON);
      await testSubjects.missingOrFail(CHROME_NEXT_SEARCH_MODAL);
    }
  }
}
