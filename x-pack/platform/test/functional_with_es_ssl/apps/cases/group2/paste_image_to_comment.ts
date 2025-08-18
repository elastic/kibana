/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WebDriver } from 'selenium-webdriver';
import expect from '@kbn/expect';
import type { FtrProviderContext } from '../../../ftr_provider_context';

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const browser = getService('browser');
  const cases = getService('cases');
  const find = getService('find');
  const PageObjects = getPageObjects(['common', 'header']);
  const retry = getService('retry');

  describe('Paste screenshot into comment editor', function () {
    // this suite uses a paste image trick that will likely not work well in Firefox
    // @ts-ignore – mocha typings don’t include tags
    this.tags(['skipFirefox']);

    let imageMarkdownUrl: string | null = null;
    let driver: WebDriver;
    before(async () => {
      const webDriver = await getService('__webdriver__').init();
      driver = webDriver.driver;
      await cases.api.deleteAllCases();
    });

    after(async () => {
      await cases.api.deleteAllCases();
    });

    it('creates a case and navigates to it', async () => {
      await cases.navigation.navigateToApp();
      await cases.api.createCase({
        title: 'Sample case',
        description: 'Testing image paste in comments',
      });
      await cases.casesTable.waitForCasesToBeListed();
      await cases.casesTable.goToFirstListedCase();
      await PageObjects.header.waitUntilLoadingHasFinished();
    });

    it('captures a screenshot and pastes it into the markdown editor', async () => {
      const takeScreenshotResult = await browser.takeScreenshot();
      await driver.executeScript(async (screenshotData: string) => {
        const blob = new Blob([
          new Uint8Array(
            atob(screenshotData)
              .split('')
              .map((c) => c.charCodeAt(0))
          ),
        ]);
        const imageFile = new File([blob], 'screenshot.png', { type: 'image/png' });

        const clipboardData = new DataTransfer();
        clipboardData.items.add(imageFile);

        const pasteEvent = new ClipboardEvent('paste', {
          clipboardData,
          bubbles: true,
          cancelable: true,
        });
        const textarea = document.querySelector('#newComment');
        if (textarea) {
          textarea.dispatchEvent(pasteEvent);
        }
      }, takeScreenshotResult);
    });

    it('uploads the image and replaces the placeholder with a markdown link', async () => {
      // check that image upload placeholder text is displayed
      await retry.waitFor('textarea to contain upload placeholder text', async () => {
        const textarea = await find.byCssSelector('#newComment');
        if (!textarea) return false;
        const content = await textarea.getVisibleText();
        return content?.includes('<!-- uploading "screenshot.png" -->');
      });

      // wait for the image placeholder to be replaced with markdown url
      await retry.waitFor('image placeholder is replaced with markdown url', async () => {
        const textarea = await find.byCssSelector('#newComment');
        if (!textarea) return false;
        const content = await textarea?.getVisibleText();
        if (!content) return false;
        // we don't know the full url because the asset gets a unique id
        expect(content.includes('![screenshot.png](/api/files/files/')).to.be(true);
        imageMarkdownUrl = content;
        return true;
      });
    });

    it('shows the uploaded image in markdown preview', async () => {
      // open the markdown preview
      await find.clickByButtonText('Preview');

      // assert the image is present
      const image = await find.existsByCssSelector('img[alt="screenshot.png"]');
      expect(!!image).to.be(true);

      // assert that the image is a real image
      await retry.waitFor(
        'the uploaded image displays in the markdown editor preview',
        async () => {
          const result = await driver.executeScript<boolean>(() => {
            const img = document.querySelector(
              'img[alt="screenshot.png"]'
            ) as HTMLImageElement | null;
            return img && img.complete && img.naturalWidth > 0;
          });
          expect(result).to.be(true);
          return result;
        }
      );
    });

    it('adds the comment and renders the image attachment', async () => {
      // create the comment
      await find.clickByButtonText('Add comment');

      // wait for the comment to appear
      await retry.waitFor('comment to appear', async () => {
        const comment = await find.existsByCssSelector('figure.euiCommentEvent');
        return !!comment;
      });

      // find the rendered image tag within the comment element
      const commentImage = await find.byCssSelector(
        'figure.euiCommentEvent img[alt="screenshot.png"]'
      );
      expect(!!commentImage).to.be(true);
      expect(await commentImage.isDisplayed()).to.be(true);

      const currentUrl = await browser.getCurrentUrl();
      const parsedUrl = new URL(currentUrl);
      const baseUrl = `${parsedUrl.protocol}//${parsedUrl.host}`;

      if (imageMarkdownUrl === null) {
        throw new Error('Image markdown url not found');
      }

      const expectedUrl = `${baseUrl}${imageMarkdownUrl.substring(
        imageMarkdownUrl.indexOf('(') + 1,
        imageMarkdownUrl.indexOf(')')
      )}`;

      expect(await commentImage.getAttribute('src')).to.eql(expectedUrl);
    });
  });
};
