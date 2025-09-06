/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// TODO: Changed from PluginFunctionalProviderContext to FtrProviderContext in Serverless
import type { FtrProviderContext } from '../../../../ftr_provider_context';

export default function ({ getService, getPageObjects, loadTestFile }: FtrProviderContext) {
  const browser = getService('browser');
  const es = getService('es');
  const PageObjects = getPageObjects([
    'common',
    'header',
    'settings',
    'svlCommonNavigation',
    'svlCommonPage',
  ]);
  const testSubjects = getService('testSubjects');
  const find = getService('find');
  const retry = getService('retry');
  const kibanaServer = getService('kibanaServer');

  describe('data view field editor example', function () {
    before(async () => {
      await PageObjects.svlCommonPage.loginAsAdmin();
      // TODO: emptyKibanaIndex fails in Serverless with
      // "index_not_found_exception: no such index [.kibana_ingest]",
      // so it was switched to `savedObjects.cleanStandardList()`
      await kibanaServer.savedObjects.cleanStandardList();
      await browser.setWindowSize(1300, 900);
      await es.transport.request(
        {
          path: '/blogs/_doc',
          method: 'POST',
          body: { user: 'matt', message: 20 },
        },
        // TODO: Extend timeout in Serverless
        { requestTimeout: '1m' }
      );

      // TODO: Navigation to Data View Management is different in Serverless
      await PageObjects.common.navigateToApp('management');
      await retry.waitFor('data views link', async () => {
        if (await testSubjects.exists('app-card-dataViews')) {
          await testSubjects.click('app-card-dataViews');
          return true;
        }
        if (await find.existsByCssSelector('[href*="/dataViews"]')) {
          await find.clickByCssSelector('[href*="/dataViews"]');
          return true;
        }
        return false;
      });
      // re-create default dataview : default_all_data_id which was created when serverles_search plugin was started.
      await PageObjects.settings.createIndexPattern(
        'blogs',
        null,
        true,
        'default_all_data_id',
        'default:all-data'
      );

      await PageObjects.common.navigateToApp('dataViewFieldEditorExample');
    });

    loadTestFile(require.resolve('./data_view_field_editor_example'));
  });
}
