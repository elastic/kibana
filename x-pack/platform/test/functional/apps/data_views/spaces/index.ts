/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const { settings } = getPageObjects(['settings']);
  const spacesService = getService('spaces');
  const esArchiver = getService('esArchiver');
  const testSubjects = getService('testSubjects');
  const kibanaServer = getService('kibanaServer');
  const retry = getService('retry');

  describe('spaces', function () {
    this.tags('skipFirefox');

    before(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await esArchiver.loadIfNeeded(
        'x-pack/platform/test/fixtures/es_archives/logstash_functional'
      );
    });

    it('it can add a space', async () => {
      await spacesService.create({
        id: 'custom_space',
        name: 'custom_space',
        disabledFeatures: [],
      });

      await settings.navigateTo();
      await settings.clickKibanaIndexPatterns();
      await settings.createIndexPattern('log*');

      // Wait for data view creation to fully complete
      await retry.waitForWithTimeout('data view to be created and listed', 5000, async () => {
        await settings.clickKibanaIndexPatterns();
        return await testSubjects.exists('indexPatternTable');
      });

      // click manage spaces on first entry
      // first avatar is in header, so we want the second one
      await (await testSubjects.findAll('space-avatar-default', 1000))[1].click();

      // select custom space
      await testSubjects.click('sts-space-selector-row-custom_space');
      await testSubjects.click('sts-save-button');

      // verify custom space has been added to list with retry
      await retry.waitForWithTimeout('custom space avatar to appear', 5000, async () => {
        return await testSubjects.exists('space-avatar-custom_space');
      });
    });
  });
}
