/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrProviderContext } from '../../../ftr_provider_context';
export default function ({ getPageObject, getService }: FtrProviderContext) {
  const cases = getService('cases');
  const commonScreenshots = getService('commonScreenshots');
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');
  const header = getPageObject('header');
  const screenshotDirectories = ['response_ops_docs', 'stack_cases'];

  describe('case settings', function () {
    it('case settings screenshot', async () => {
      // With the templates feature flag pinned ON for this suite, custom fields and
      // templates are managed on the dedicated v2 templates / field-library pages
      // rather than inline on the Case Settings page.
      await cases.navigation.navigateToApp();
      await cases.navigation.navigateToConfigurationPage();
      await header.waitUntilLoadingHasFinished();
      await commonScreenshots.takeScreenshot('cases-settings', screenshotDirectories, 1400, 1024);

      // Templates list page — reachable when the templates flag is ON.
      await cases.navigation.navigateToTemplatesPage();
      await header.waitUntilLoadingHasFinished();
      await retry.waitFor('templates-table exist', async () => {
        return await testSubjects.exists('templates-table');
      });
      await commonScreenshots.takeScreenshot(
        'cases-templates-add',
        screenshotDirectories,
        1400,
        1000
      );

      // Field library page — reachable when the templates flag is ON.
      await cases.navigation.navigateToFieldLibraryPage();
      await header.waitUntilLoadingHasFinished();
      await retry.waitFor('fieldDefinitionsTable exist', async () => {
        return await testSubjects.exists('fieldDefinitionsTable');
      });
      await commonScreenshots.takeScreenshot(
        'cases-custom-fields-add',
        screenshotDirectories,
        1400,
        700
      );

      await cases.navigation.navigateToApp();
      await testSubjects.click('createNewCaseBtn');
      await commonScreenshots.takeScreenshot('cases-create', screenshotDirectories, 1400, 1900);
      await testSubjects.click('create-case-cancel');
    });
  });
}
