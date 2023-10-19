/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { journey, step, expect, before } from '@elastic/synthetics';
import { SYNTHETICS_API_URLS } from '../../../common/constants';
import { recordVideo } from '../../helpers/record_video';

journey('ProjectAPIKeys', async ({ page }) => {
  recordVideo(page);

  let apiKey = '';

  page.setDefaultTimeout(3 * 30000);

  before(async () => {
    page.on('request', (evt) => {
      if (
        evt.resourceType() === 'fetch' &&
        evt.url().includes(SYNTHETICS_API_URLS.SYNTHETICS_PROJECT_APIKEY)
      ) {
        evt
          .response()
          ?.then((res) => res?.json())
          .then((res) => {
            apiKey = res.apiKey.encoded;
          });
      }
    });
  });

  step('Go to http://localhost:5620/login?next=%2Fapp%2Fsynthetics%2Fsettings', async () => {
    await page.goto('http://localhost:5620/login?next=%2Fapp%2Fsynthetics%2Fsettings');
    await page.click('input[name="username"]');
    await page.fill('input[name="username"]', 'elastic');
    await page.press('input[name="username"]', 'Tab');
    await page.fill('input[name="password"]', 'changeme');
    await Promise.all([
      page.waitForNavigation({ url: 'http://localhost:5620/app/synthetics/settings/alerting' }),
      page.click('button:has-text("Log in")'),
    ]);
  });
  step('Click text=Project API Keys', async () => {
    await page.click('text=Project API Keys');
    expect(page.url()).toBe('http://localhost:5620/app/synthetics/settings/api-keys');
    await page.click('button:has-text("Generate Project API key")');
    await page.click(
      'text=This API key will only be shown once. Please keep a copy for your own records.'
    );
    await page.click('strong:has-text("API key")');
    await page.click('text=Use as environment variable');
    await page.click(`text=${apiKey}`);
    await page.click('[aria-label="Account menu"]');
  });
  step('Click text=Log out', async () => {
    await page.click('text=Log out');
    expect(page.url()).toBe('http://localhost:5620/login?msg=LOGGED_OUT');
    await page.fill('input[name="username"]', 'viewer');
    await page.press('input[name="username"]', 'Tab');
    await page.fill('input[name="password"]', 'changeme');
    await Promise.all([
      page.waitForNavigation({ url: 'http://localhost:5620/app/home' }),
      page.click('button:has-text("Log in")'),
    ]);
    await page.goto('http://localhost:5620/app/synthetics/settings/api-keys', {
      waitUntil: 'networkidle',
    });
  });
  step('Click text=Synthetics', async () => {
    expect(page.url()).toBe('http://localhost:5620/app/synthetics/settings/api-keys');
    await page.isDisabled('button:has-text("Generate Project API key")');
  });
});
