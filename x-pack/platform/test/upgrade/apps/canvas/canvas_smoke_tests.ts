/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const retry = getService('retry');
  const { common, header, home } = getPageObjects(['common', 'header', 'home']);
  const testSubjects = getService('testSubjects');
  const browser = getService('browser');

  describe('upgrade canvas smoke tests', function describeIndexTests() {
    const spaces = [
      { space: 'default', basePath: '' },
      { space: 'automation', basePath: 's/automation' },
    ];

    const canvasTests = [
      { name: 'flights', page: 1, numElements: 33 },
      { name: 'logs', page: 1, numElements: 56 },
      { name: 'ecommerce', page: 1, numElements: 15 },
      { name: 'ecommerce', page: 2, numElements: 8 },
    ];

    spaces.forEach(({ space, basePath }) => {
      canvasTests.forEach(({ name, numElements, page }) => {
        describe('space: ' + space, () => {
          before(async () => {
            await common.navigateToActualUrl('home', '/tutorial_directory/sampleData', {
              basePath,
            });
            await header.waitUntilLoadingHasFinished();
            await home.launchSampleCanvas(name);
            await header.waitUntilLoadingHasFinished();
          });
          it('renders elements on workpad ' + name + ' page ' + page, async () => {
            const browserUrl = await browser.getCurrentUrl();
            const currentUrl = new URL(browserUrl);
            const pathname = currentUrl.pathname;
            const hash = currentUrl.hash;
            if (hash.length === 0 && pathname.replace(/\/$/, '') === basePath + '/app/canvas') {
              throw new Error('Did not launch canvas sample data for ' + name);
            }
            if (name === 'ecommerce') {
              if (!browserUrl.includes('page/' + page)) {
                await browser.get(browserUrl.replace(/\/[^\/]*$/, '/' + page), false);
                await header.waitUntilLoadingHasFinished();
              }
            }
            await retry.try(async () => {
              const elements = await testSubjects.findAll(
                'canvasWorkpadPage > canvasWorkpadPageElementContent'
              );
              expect(elements.length).to.be.greaterThan(numElements);
            });
          });
        });
      });
    });
  });
}
