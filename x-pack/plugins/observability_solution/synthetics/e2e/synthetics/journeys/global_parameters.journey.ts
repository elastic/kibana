/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { journey, step, before, after, expect } from '@elastic/synthetics';
import { byTestId } from '../../helpers/utils';
import { cleanTestParams } from './services/add_monitor';
import { syntheticsAppPageProvider } from '../page_objects/synthetics_app';

const journeySkip =
  (...params: Parameters<typeof journey>) =>
  () =>
    journey(...params);
// See details: https://github.com/elastic/kibana/issues/191961
journeySkip(`GlobalParameters`, async ({ page, params }) => {
  const syntheticsApp = syntheticsAppPageProvider({ page, kibanaUrl: params.kibanaUrl, params });

  before(async () => {
    await cleanTestParams(params);
  });

  after(async () => {
    await cleanTestParams(params);
  });

  step('Go to Settings page', async () => {
    await syntheticsApp.navigateToSettings(true);
  });

  step('go to params tab', async () => {
    await page.click('text=Global Parameters');
  });

  step('Click text=Settings', async () => {
    await page.click(byTestId('settings-page-link'));
    expect(page.url()).toBe('http://localhost:5620/app/synthetics/settings/alerting');
  });
  step('Click text=Global Parameters', async () => {
    await page.click('text=Global Parameters');
    expect(page.url()).toBe('http://localhost:5620/app/synthetics/settings/params');
    await page.click('text=No items found');
    await page.click('button:has-text("Create Parameter")');
    await page.click('[aria-label="Key"]');
    await page.fill('[aria-label="Key"]', 'username');
    await page.click('[aria-label="Value"]');
    await page.fill('[aria-label="Value"]', 'elastic');
    await page.click('.euiComboBox__inputWrap');
    await page.fill('[aria-label="Tags"]', 'dev');
    await page.click('[aria-label="Description"]');
    await page.fill('[aria-label="Description"]', 'website username');
    await page.click('button:has-text("Save")');
    await page.click('text=website username');
    await page.click('text=username');
    await page.click('[aria-label="View parameter value"]');
    await page.click('tbody >> text=elastic');
    await page.click('[aria-label="View parameter value"]');
    await page.click('text=•••••••');
  });

  step('Perform search', async () => {
    await page.click('[placeholder="Search..."]');
    await page.fill('[placeholder="Search..."]', 'username');
    await page.click('text=username');
    await page.click('[aria-label="Clear input"]');
    await page.click('[placeholder="Search..."]');
    await page.fill('[placeholder="Search..."]', 'website');
    await page.click('text=website username');
    await page.click('[placeholder="Search..."]', {
      clickCount: 3,
    });
    await page.fill('[placeholder="Search..."]', 'extra');
    await page.keyboard.press('Enter');
    await page.click('text=No items found');
    await page.click('[aria-label="Clear input"]');
  });

  step('Click text=Delete ParameterEdit Parameter >> :nth-match(button, 2)', async () => {
    await page.click('text=Delete ParameterEdit Parameter >> :nth-match(button, 2)');
    await page.click('[aria-label="Key"]');
    await page.fill('[aria-label="Key"]', 'username2');
    await page.click('[aria-label="Value"]');
    await page.fill('[aria-label="Value"]', 'elastic2');
    await page.click('.euiComboBox__inputWrap');
    await page.fill('[aria-label="Tags"]', 'staging');
    await page.press('[aria-label="Tags"]', 'Enter');
    await page.click('button:has-text("Save")');
    await page.click('text=username2');
    await page.click('text=staging');
    await page.click('button:has-text("Tags")');
    await page.click('[aria-label="Tags"] >> text=staging');
    await page.click('[aria-label="Clear input"]');
  });
  step('Click text=Delete ParameterEdit Parameter >> button', async () => {
    await page.click('text=Delete ParameterEdit Parameter >> button');
    await page.click('button:has-text("Delete")');
    await page.click('text=No items found');
  });
});
