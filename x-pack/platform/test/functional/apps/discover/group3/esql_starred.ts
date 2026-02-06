/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
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
      await esql.isQueryPresentInTable('FROM logstash-*', starredItems);
    });

    it('should persist the starred query after a browser refresh', async () => {
      await browser.refresh();
      await header.waitUntilLoadingHasFinished();
      await discover.waitUntilSearchingHasFinished();
      await unifiedFieldList.waitUntilSidebarHasLoaded();

      await testSubjects.click('ESQLEditor-toggle-query-history-icon');
      await testSubjects.click('starred-queries-tab');
      const starredItems = await esql.getStarredItems();
      await esql.isQueryPresentInTable('FROM logstash-*', starredItems);
    });

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
      expect(editorValue).to.eql(`FROM logstash-*`);
    });

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
