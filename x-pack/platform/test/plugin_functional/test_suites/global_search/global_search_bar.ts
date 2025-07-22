/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  describe('GlobalSearchBar', function () {
    const { common, navigationalSearch } = getPageObjects(['common', 'navigationalSearch']);
    const browser = getService('browser');
    const kibanaServer = getService('kibanaServer');
    const retry = getService('retry');

    before(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await kibanaServer.importExport.load(
        'x-pack/test/functional/fixtures/kbn_archiver/global_search/search_syntax'
      );
      await common.navigateToApp('home');
    });

    after(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
    });

    afterEach(async () => {
      await navigationalSearch.blur();
    });

    it('shows the popover on focus', async () => {
      await navigationalSearch.focus();

      expect(await navigationalSearch.isPopoverDisplayed()).to.eql(true);

      await navigationalSearch.blur();

      expect(await navigationalSearch.isPopoverDisplayed()).to.eql(false);
    });

    it('redirects to the correct page', async () => {
      await navigationalSearch.searchFor('type:application discover');
      await navigationalSearch.clickOnOption(0);

      expect(await browser.getCurrentUrl()).to.contain('discover');
    });

    describe('search suggestions', () => {
      it('shows a suggestion when searching for a term matching a type', async () => {
        await navigationalSearch.searchFor('dashboard');

        const dashboardTypeSearchResult = await retry.try(async () => {
          await navigationalSearch.searchFor('dashboard');
          const results = await navigationalSearch.getDisplayedResults();
          // will throw if results not found
          expect(results.length).greaterThan(0);
          return results;
        });

        expect(dashboardTypeSearchResult[0].label).to.eql('type: dashboard');

        await navigationalSearch.clickOnOption(0);
        await navigationalSearch.waitForResultsLoaded();

        const searchTerm = await navigationalSearch.getFieldValue();
        expect(searchTerm).to.eql('type:dashboard');

        const results = await navigationalSearch.getDisplayedResults();
        expect(results.map((result) => result.label)).to.eql([
          'dashboard 1 (tag-2)',
          'dashboard 2 (tag-3)',
          'dashboard 3 (tag-1 and tag-3)',
          'dashboard 4 (tag-special-chars)',
        ]);
      });
      it('shows a suggestion when searching for a term matching a tag name', async () => {
        await navigationalSearch.searchFor('tag-1');

        let results = await navigationalSearch.getDisplayedResults();
        expect(results[0].label).to.eql('tag: tag-1');

        await navigationalSearch.clickOnOption(0);
        await navigationalSearch.waitForResultsLoaded();

        const searchTerm = await navigationalSearch.getFieldValue();
        expect(searchTerm).to.eql('tag:tag-1');

        results = await navigationalSearch.getDisplayedResults();
        expect(results.map((result) => result.label)).to.eql([
          'Visualization 1 (tag-1)',
          'Visualization 3 (tag-1 + tag-3)',
          'dashboard 3 (tag-1 and tag-3)',
        ]);
      });
    });

    describe('advanced search syntax', () => {
      it('allows to filter by type', async () => {
        await navigationalSearch.searchFor('type:dashboard');

        const results = await navigationalSearch.getDisplayedResults();

        expect(results.map((result) => result.label)).to.eql([
          'dashboard 1 (tag-2)',
          'dashboard 2 (tag-3)',
          'dashboard 3 (tag-1 and tag-3)',
          'dashboard 4 (tag-special-chars)',
        ]);
      });

      it('allows to filter by multiple types', async () => {
        await navigationalSearch.searchFor('type:(dashboard OR visualization)');

        const results = await navigationalSearch.getDisplayedResults();

        expect(results.map((result) => result.label)).to.eql([
          'Visualization 1 (tag-1)',
          'Visualization 2 (tag-2)',
          'Visualization 3 (tag-1 + tag-3)',
          'Visualization 4 (tag-2)',
          'My awesome vis (tag-4)',
          'dashboard 1 (tag-2)',
          'dashboard 2 (tag-3)',
          'dashboard 3 (tag-1 and tag-3)',
          'dashboard 4 (tag-special-chars)',
        ]);
      });

      it('allows to filter by tag', async () => {
        await navigationalSearch.searchFor('tag:tag-1');

        const results = await navigationalSearch.getDisplayedResults();

        expect(results.map((result) => result.label)).to.eql([
          'Visualization 1 (tag-1)',
          'Visualization 3 (tag-1 + tag-3)',
          'dashboard 3 (tag-1 and tag-3)',
        ]);
      });

      it('allows to filter by multiple tags', async () => {
        await navigationalSearch.searchFor('tag:tag-1 tag:tag-3');

        const results = await navigationalSearch.getDisplayedResults();

        expect(results.map((result) => result.label)).to.eql([
          'Visualization 1 (tag-1)',
          'Visualization 3 (tag-1 + tag-3)',
          'dashboard 2 (tag-3)',
          'dashboard 3 (tag-1 and tag-3)',
        ]);
      });

      it('allows to filter by type and tag', async () => {
        await navigationalSearch.searchFor('type:dashboard tag:tag-3');

        const results = await navigationalSearch.getDisplayedResults();

        expect(results.map((result) => result.label)).to.eql([
          'dashboard 2 (tag-3)',
          'dashboard 3 (tag-1 and tag-3)',
        ]);
      });

      it('allows to filter by multiple types and tags', async () => {
        await navigationalSearch.searchFor(
          'type:(dashboard OR visualization) tag:(tag-1 OR tag-3)'
        );

        const results = await navigationalSearch.getDisplayedResults();

        expect(results.map((result) => result.label)).to.eql([
          'Visualization 1 (tag-1)',
          'Visualization 3 (tag-1 + tag-3)',
          'dashboard 2 (tag-3)',
          'dashboard 3 (tag-1 and tag-3)',
        ]);
      });

      it('allows to filter by term and type', async () => {
        await navigationalSearch.searchFor('type:visualization awesome');

        const results = await navigationalSearch.getDisplayedResults();

        expect(results.map((result) => result.label)).to.eql(['My awesome vis (tag-4)']);
      });

      it('allows to filter by term and tag', async () => {
        await navigationalSearch.searchFor('tag:tag-4 awesome');

        const results = await navigationalSearch.getDisplayedResults();

        expect(results.map((result) => result.label)).to.eql(['My awesome vis (tag-4)']);
      });

      it('allows to filter by tags containing special characters', async () => {
        await navigationalSearch.searchFor('tag:"my%tag"');

        const results = await navigationalSearch.getDisplayedResults();

        expect(results.map((result) => result.label)).to.eql(['dashboard 4 (tag-special-chars)']);
      });

      it('returns no results when searching for an unknown tag', async () => {
        await navigationalSearch.searchFor('tag:unknown');

        expect(await navigationalSearch.isNoResultsPlaceholderDisplayed()).to.eql(true);
      });

      it('returns no results when searching for an unknown type', async () => {
        await navigationalSearch.searchFor('type:unknown');

        expect(await navigationalSearch.isNoResultsPlaceholderDisplayed()).to.eql(true);
      });
    });
  });
}
