/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { test } from '../../fixtures';
import { EXTENDED_TIMEOUT } from '../../fixtures/constants';

const APM_DEEP_LINKS = [
  { title: 'Applications / Service inventory', url: '/apm/services' },
  { title: 'Applications / Service groups', url: '/apm/service-groups' },
  { title: 'Applications / Traces', url: '/apm/traces' },
  { title: 'Applications / Service map', url: '/apm/service-map' },
  { title: 'Applications / Dependencies', url: '/apm/dependencies/inventory' },
  { title: 'Applications / Settings', url: '/apm/settings/general-settings' },
];

// The global search exposes the same APM deep links under both the `apm` and
// `applications` keywords, so we assert parity for both.
for (const keyword of ['apm', 'applications']) {
  test.describe(
    `Applications deep links for "${keyword}" keyword`,
    { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
    () => {
      test.beforeEach(async ({ browserAuth, pageObjects: { navigationPage } }) => {
        await browserAuth.loginAsViewer();
        await navigationPage.gotoHome();
      });

      for (const { title, url } of APM_DEEP_LINKS) {
        test(`navigates to ${title}`, async ({ page, pageObjects: { navigationPage } }) => {
          await expect(async () => {
            await navigationPage.searchGlobalNav(keyword);
            await navigationPage.clickSearchResult(title);
            await expect(page).toHaveURL(new RegExp(url.replace(/\//g, '\\/')), { timeout: 2000 });
          }).toPass({ timeout: EXTENDED_TIMEOUT });
        });
      }
    }
  );
}
