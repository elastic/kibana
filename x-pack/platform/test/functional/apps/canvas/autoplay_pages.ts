/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../../ftr_provider_context';

export default function canvasAutoplayPagesTest({ getService, getPageObjects }: FtrProviderContext) {
  const browser = getService('browser');
  const retry = getService('retry');
  const testSubjects = getService('testSubjects');
  const { canvas } = getPageObjects(['canvas']);
  const kibanaServer = getService('kibanaServer');

  describe('autoplay page cycling with page count changes', function () {
    before(async () => {
      await canvas.goToListingPage();
    });

    after(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
    });

    it('includes a newly added page in the autoplay cycle', async () => {
      // Start with a blank workpad (1 page)
      await canvas.createNewWorkpad();
      await retry.waitFor('workpad page to load', () => testSubjects.exists('canvasWorkpadPage'));

      // Extract workpad ID and origin from the current URL
      const initialUrl = await browser.getCurrentUrl();
      const urlObj = new URL(initialUrl);
      const pathMatch = urlObj.pathname.match(/\/workpad\/([^\/]+)\/page\/\d+/);
      expect(pathMatch).not.to.be(null);
      const workpadId = pathMatch![1];
      const appBase = `${urlObj.origin}/app/canvas/workpad/${workpadId}`;

      // Add a second page so the workpad has 2 pages to cycle between
      await canvas.addNewPage();
      await retry.waitFor('navigated to page 2', async () => {
        const url = await browser.getCurrentUrl();
        return /\/page\/2(\?|#|$)/.test(url);
      });

      // Confirm basic autoplay works: fullscreen + 1 s interval starting on page 1
      // should advance to page 2 within a few seconds.
      await browser.navigateTo(`${appBase}/page/1?__fullScreen=true&__autoplayInterval=1s`);
      await retry.waitFor('fullscreen to activate', () =>
        testSubjects.exists('canvasWorkpadPage')
      );

      await retry.tryForTime(5000, async () => {
        const url = await browser.getCurrentUrl();
        expect(url).to.match(/\/page\/2(\?|#|$)/);
      });

      // Exit fullscreen before editing
      await canvas.exitFullscreen();

      // Add a third page — regression scenario from issue #268125.
      // Verifies that the autoplay timer uses the current page count after
      // the workpad is modified and fullscreen is re-entered.
      await canvas.addNewPage();
      await retry.waitFor('navigated to page 3', async () => {
        const url = await browser.getCurrentUrl();
        return /\/page\/3(\?|#|$)/.test(url);
      });

      // Re-enter fullscreen with 1 s autoplay starting on page 2.
      // nextPage() should now see workpadPages = 3 and navigate to page 3.
      await browser.navigateTo(`${appBase}/page/2?__fullScreen=true&__autoplayInterval=1s`);
      await retry.waitFor('fullscreen to activate again', () =>
        testSubjects.exists('canvasWorkpadPage')
      );

      // Core assertion: page 3 must be reached within a few autoplay ticks,
      // proving the timer uses the updated page count.
      await retry.tryForTime(5000, async () => {
        const url = await browser.getCurrentUrl();
        expect(url).to.match(/\/page\/3(\?|#|$)/);
      });

      await canvas.exitFullscreen();
    });
  });
}
