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

const APM_SERVER_SECTIONS = [
  'APM Server',
  'Linux DEB',
  'Linux RPM',
  'Other Linux',
  'macOS',
  'Windows',
  'Fleet',
];

const APM_AGENT_SECTIONS = [
  'APM Agents',
  'Java',
  'RUM (JS)',
  'Node.js',
  'Django',
  'Flask',
  'Ruby on Rails',
  'Rack',
  'Go',
  '.NET',
  'PHP',
];

test.describe('APM tutorial', { tag: tags.stateful.classic }, () => {
  test.beforeEach(async ({ browserAuth, page, kbnUrl }) => {
    await browserAuth.loginAsViewer();
    await page.goto(`${kbnUrl.app('home')}#/tutorial/apm`);
    await page
      .getByTestId('activateFullScreenButton')
      .waitFor({ state: 'visible', timeout: EXTENDED_TIMEOUT });
  });

  test('includes the section for the APM Server', async ({ page }) => {
    for (const section of APM_SERVER_SECTIONS) {
      await expect(page.getByText(section, { exact: true })).not.toHaveCount(0, {
        timeout: EXTENDED_TIMEOUT,
      });
    }
  });

  test('includes the section for the APM agents', async ({ page }) => {
    for (const section of APM_AGENT_SECTIONS) {
      await expect(page.getByText(section, { exact: true })).not.toHaveCount(0, {
        timeout: EXTENDED_TIMEOUT,
      });
    }
  });
});
