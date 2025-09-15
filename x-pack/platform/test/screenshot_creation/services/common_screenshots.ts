/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../ftr_provider_context';

export function CommonScreenshotsProvider({ getService }: FtrProviderContext) {
  const browser = getService('browser');
  const screenshot = getService('screenshots');
  const testSubjects = getService('testSubjects');

  const DEFAULT_WIDTH = 1920;
  const DEFAULT_HEIGHT = 1080;

  return {
    async takeScreenshot(name: string, subDirectories: string[], width?: number, height?: number) {
      await browser.setWindowSize(width ?? DEFAULT_WIDTH, height ?? DEFAULT_HEIGHT);
      await new Promise((resolve) => setTimeout(resolve, 1000)); // give components time to resize
      await screenshot.take(`${name}_new`, undefined, subDirectories);
      await browser.setWindowSize(DEFAULT_WIDTH, DEFAULT_HEIGHT);
    },

    async openKibanaNav() {
      if (!(await testSubjects.exists('collapsibleNav'))) {
        await testSubjects.click('toggleNavButton');
      }
      await testSubjects.existOrFail('collapsibleNav');
    },

    async closeKibanaNav() {
      if (await testSubjects.exists('collapsibleNav')) {
        await testSubjects.click('toggleNavButton');
      }
      await testSubjects.missingOrFail('collapsibleNav');
    },

    async removeFocusFromElement() {
      // open and close the Kibana nav to un-focus the last used element
      await this.openKibanaNav();
      await this.closeKibanaNav();
    },
  };
}
