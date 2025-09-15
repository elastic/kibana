/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../ftr_provider_context';
import { caseTitle } from '.';

export default function ({ getService }: FtrProviderContext) {
  const browser = getService('browser');
  const cases = getService('cases');
  const commonScreenshots = getService('commonScreenshots');
  const testSubjects = getService('testSubjects');

  const screenshotDirectories = ['response_ops_docs', 'stack_cases'];

  describe('details view', function () {
    it('case details screenshots', async () => {
      await cases.navigation.navigateToApp();
      await testSubjects.setValue('search-cases', caseTitle);
      await browser.pressKeys(browser.keys.ENTER);
      const caseLink = await testSubjects.find('case-details-link');
      await caseLink.click();
      await cases.singleCase.addVisualizationToNewComment('[Logs] Bytes distribution');
      await cases.singleCase.openVisualizationButtonTooltip();
      await commonScreenshots.takeScreenshot(
        'cases-visualization',
        screenshotDirectories,
        1400,
        1024
      );
      const filesTab = await testSubjects.find('case-view-tab-title-files');
      await filesTab.click();
      await commonScreenshots.takeScreenshot('cases-files', screenshotDirectories, 1400, 1024);
    });
  });
}
