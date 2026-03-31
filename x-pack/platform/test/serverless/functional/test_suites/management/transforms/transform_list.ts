/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../../../ftr_provider_context';

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const pageObjects = getPageObjects(['svlCommonPage', 'common', 'header']);
  const browser = getService('browser');
  const security = getService('security');
  const testSubjects = getService('testSubjects');
  const transform = getService('transform');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');

  // FLAKY: https://github.com/elastic/kibana/issues/258218
  describe.skip('Transform List', function () {
    before(async () => {
      await security.testUser.setRoles(['transform_user']);
      await pageObjects.svlCommonPage.loginAsAdmin();

      // Load logstash* data and create dataview for logstash*, logstash-2015.09.22
      await esArchiver.loadIfNeeded(
        'x-pack/platform/test/fixtures/es_archives/logstash_functional'
      );
      await kibanaServer.importExport.load(
        'x-pack/platform/test/functional/fixtures/kbn_archives/visualize/default'
      );

      // Best-effort cleanup. Solutions might set up transforms automatically
      // during/after setup, so the UI might render either the empty state or the table.
      await transform.api.cleanTransformIndices();
    });

    after(async () => {
      await esArchiver.unload('x-pack/platform/test/fixtures/es_archives/logstash_functional');
      await kibanaServer.savedObjects.cleanStandardList();
    });

    it('renders the transform list', async () => {
      await transform.testExecution.logTestStep('should load the Transform list page');
      await transform.navigation.navigateTo();
      await transform.management.assertTransformListPageExists();

      const url = await browser.getCurrentUrl();
      expect(url).to.contain(`/transform`);

      await transform.testExecution.logTestStep('should display the stats bar');
      await transform.management.assertTransformStatsBarExists();

      await transform.testExecution.logTestStep(
        'should render an empty state or transforms table with a create button'
      );
      if (await testSubjects.exists('transformNoTransformsFound')) {
        await transform.management.assertNoTransformsFoundMessageExists();
        await transform.management.assertCreateFirstTransformButtonExists();
      } else {
        await transform.table.waitForTransformsTableToLoad();
        await transform.management.assertTransformsTableExists();
        await transform.management.assertCreateNewTransformButtonExists();
      }
    });

    it('opens transform creation wizard', async () => {
      await transform.management.startTransformCreation();
      await transform.sourceSelection.selectSource('logstash-2015.09.22');
      await transform.datePicker.assertUseFullDataButtonVisible(true);
      await transform.datePicker.assertDatePickerDataTierOptionsVisible(false);
    });
  });
};
