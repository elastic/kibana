/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
/**
 * Migration recommendation: MIXED, mostly cover below the browser. The starred-queries UI is
 * already unit tested in
 * src/platform/packages/private/kbn-esql-editor/src/editor_footer/history_starred_queries.test.tsx
 * and esql_starred_queries_service.test.tsx, and the favorites persistence API is covered by
 * src/platform/plugins/shared/content_management/test/scout/api/tests/favorites_esql_query.spec.ts.
 * Keep at most one Scout test for the end-to-end wiring (star from history, survive a reload, load
 * back into the editor).
 *
 * Also note: the `discover_read_user` / `discover_read_role` setup adds a role + user + two logins
 * to every run, but no test here asserts anything read-only specific. Drop it during migration and
 * use a standard Scout `browserAuth` role.
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const monacoEditor = getService('monacoEditor');
  const { common, discover, header, unifiedFieldList, security } = getPageObjects([
    'common',
    'discover',
    'header',
    'unifiedFieldList',
    'security',
  ]);
  const testSubjects = getService('testSubjects');
  const esql = getService('esql');
  const securityService = getService('security');
  const browser = getService('browser');

  const user = 'discover_read_user';
  const role = 'discover_read_role';

  describe('Discover ES|QL starred queries', () => {
    before('initialize tests', async () => {
      await esArchiver.loadIfNeeded(
        'x-pack/platform/test/fixtures/es_archives/logstash_functional'
      );
      await kibanaServer.importExport.load(
        'x-pack/platform/test/functional/fixtures/kbn_archives/lens/lens_basic.json'
      );

      await security.forceLogout();

      await securityService.role.create(role, {
        elasticsearch: {
          indices: [{ names: ['logstash-*'], privileges: ['read', 'view_index_metadata'] }],
        },
        kibana: [
          {
            feature: {
              discover: ['read'],
            },
            spaces: ['*'],
          },
        ],
      });

      await securityService.user.create(user, {
        password: 'changeme',
        roles: [role],
        full_name: user,
      });

      await security.login(user, 'changeme', {
        expectSpaceSelector: false,
      });
    });

    after('clean up archives', async () => {
      await esArchiver.unload('x-pack/platform/test/fixtures/es_archives/logstash_functional');
      await kibanaServer.importExport.unload(
        'x-pack/platform/test/functional/fixtures/kbn_archives/lens/lens_basic.json'
      );
      await security.forceLogout();
      await securityService.user.delete(user);
      await securityService.role.delete(role);
    });

    /**
     * Migration recommendation: MIGRATE TO SCOUT, merged with the three tests below into a single
     * spec using `test.step`. Each test currently re-navigates to Discover and re-opens the history
     * panel from scratch, so four browser sessions pay for what is one continuous flow.
     */
    it('should star a query from the editor query history', async () => {
      await common.navigateToApp('discover');
      await discover.selectTextBaseLang();
      await header.waitUntilLoadingHasFinished();
      await discover.waitUntilSearchingHasFinished();
      await unifiedFieldList.waitUntilSidebarHasLoaded();

      await testSubjects.click('ESQLEditor-toggle-query-history-icon');
      const historyItem = await esql.getHistoryItem(0);
      const button = await historyItem.findByTestSubject('ESQLFavoriteButton');
      await button.click();

      await header.waitUntilLoadingHasFinished();
      await testSubjects.click('starred-queries-tab');

      const starredItems = await esql.getStarredItems();
      await esql.isQueryPresentInTable('FROM logstash-* | SORT @timestamp DESC', starredItems);
    });

    /**
     * Migration recommendation: MIGRATE TO SCOUT (as a step of the merged spec). Persistence across
     * a reload is the one thing here that genuinely needs a browser plus the favorites backend.
     */
    it('should persist the starred query after a browser refresh', async () => {
      await browser.refresh();
      await header.waitUntilLoadingHasFinished();
      await discover.waitUntilSearchingHasFinished();
      await unifiedFieldList.waitUntilSidebarHasLoaded();

      await testSubjects.click('ESQLEditor-toggle-query-history-icon');
      await testSubjects.click('starred-queries-tab');
      const starredItems = await esql.getStarredItems();
      await esql.isQueryPresentInTable('FROM logstash-* | SORT @timestamp DESC', starredItems);
    });

    /**
     * Migration recommendation: MIGRATE TO SCOUT (as a step of the merged spec). Clicking a starred
     * item must push the query into the Monaco editor, which the jest tests do not exercise.
     */
    it('should select a query from the starred and submit it', async () => {
      await common.navigateToApp('discover');
      await discover.selectTextBaseLang();
      await header.waitUntilLoadingHasFinished();
      await discover.waitUntilSearchingHasFinished();
      await unifiedFieldList.waitUntilSidebarHasLoaded();

      await testSubjects.click('ESQLEditor-toggle-query-history-icon');
      await testSubjects.click('starred-queries-tab');

      await esql.clickStarredItem(0);
      await header.waitUntilLoadingHasFinished();

      const editorValue = await monacoEditor.getCodeEditorValue();
      expect(editorValue).to.eql(`FROM logstash-* | SORT @timestamp DESC`);
    });

    /**
     * Migration recommendation: Cover with unit tests. Unstarring plus the discard-confirmation
     * modal is component behavior; extend history_starred_queries.test.tsx. Removal is already
     * verified against the backend by the favorites_esql_query API spec.
     */
    it('should delete a query from the starred queries tab', async () => {
      await common.navigateToApp('discover');
      await discover.selectTextBaseLang();
      await header.waitUntilLoadingHasFinished();
      await discover.waitUntilSearchingHasFinished();
      await unifiedFieldList.waitUntilSidebarHasLoaded();

      await testSubjects.click('ESQLEditor-toggle-query-history-icon');
      await testSubjects.click('starred-queries-tab');

      const starredItem = await esql.getStarredItem(0);
      const button = await starredItem.findByTestSubject('ESQLFavoriteButton');
      await button.click();
      await testSubjects.click('esqlEditor-discard-starred-query-discard-btn');

      await header.waitUntilLoadingHasFinished();

      const starredItems = await esql.getStarredItems();
      expect(starredItems[0][0]).to.be('No items found');
    });
  });
}
