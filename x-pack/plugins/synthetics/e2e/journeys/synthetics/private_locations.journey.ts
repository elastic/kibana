/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { journey, step, before, after, expect } from '@elastic/synthetics';
import { byTestId } from '@kbn/observability-plugin/e2e/utils';
import { waitForLoadingToFinish } from '@kbn/ux-plugin/e2e/journeys/utils';
import {
  addTestMonitor,
  cleanPrivateLocations,
  cleanTestMonitors,
  getPrivateLocations,
} from './services/add_monitor';
import { syntheticsAppPageProvider } from '../../page_objects/synthetics_app';

journey(`PrivateLocationsSettings`, async ({ page, params }) => {
  const syntheticsApp = syntheticsAppPageProvider({ page, kibanaUrl: params.kibanaUrl });

  page.setDefaultTimeout(2 * 30000);

  before(async () => {
    await cleanPrivateLocations(params);
    await cleanTestMonitors(params);
  });

  after(async () => {
    await cleanPrivateLocations(params);
    await cleanTestMonitors(params);
  });

  step('Go to Settings page', async () => {
    await syntheticsApp.navigateToSettings(true);
  });

  step('go to private locations tab', async () => {
    await page.click('text=Private Locations');
  });

  step('Click text=Private Locations', async () => {
    await page.click('text=Private Locations');
    expect(page.url()).toBe('http://localhost:5620/app/synthetics/settings/private-locations');
    await page.click('text=No agent policies found');
    await page.click('text=Create agent policy');
    expect(page.url()).toBe('http://localhost:5620/app/fleet/policies?create');
    await page.click('[placeholder="Choose a name"]');
    await page.fill('[placeholder="Choose a name"]', 'Test fleet policy');
    await page.click('text=Collect system logs and metrics');
    await page.click('div[role="dialog"] button:has-text("Create agent policy")');
    await page.waitForTimeout(5 * 1000);
    await waitForLoadingToFinish({ page });
  });
  step('Go to http://localhost:5620/app/fleet/policies', async () => {
    await syntheticsApp.navigateToSettings(false);
    await page.click('text=Private Locations');
  });
  step('Click button:has-text("Create location")', async () => {
    await page.click('button:has-text("Create location")');
    await page.click('[aria-label="Location name"]');
    await page.fill('[aria-label="Location name"]', 'Test private');
    await page.press('[aria-label="Location name"]', 'Tab');
    await page.click('[aria-label="Select agent policy"]');
    await page.click('button[role="option"]:has-text("Test fleet policyAgents: 0")');
    await page.click('.euiComboBox__inputWrap');
    await page.fill('[aria-label="Tags"]', 'Basement');
    await page.press('[aria-label="Tags"]', 'Enter');
    await page.fill('[aria-label="Tags"]', 'Area51');
    await page.press('[aria-label="Tags"]', 'Enter');
    await page.click('button:has-text("Save")');
  });
  let locationId: string;
  step('Click text=AlertingPrivate LocationsData Retention', async () => {
    await page.click('text=Private Locations');
    await page.click('h1:has-text("Settings")');

    const privateLocations = await getPrivateLocations(params);

    const locations = privateLocations.attributes.locations;

    expect(locations.length).toBe(1);

    locationId = locations[0].id;

    await addTestMonitor(params.kibanaUrl, 'test-monitor', {
      locations: [locations[0]],
      type: 'browser',
    });
  });

  step('Click text=1', async () => {
    await page.click('text=1');
    await page.click('text=Test private');
    await page.click('.euiTableCellContent__hoverItem .euiToolTipAnchor');
    await page.click('button:has-text("Tags")');
    await page.click('[aria-label="Tags"] >> text=Area51');
    await page.click(
      'main div:has-text("Private locations allow you to run monitors from your own premises. They require")'
    );
    await page.click('text=Test private');

    await page.click('.euiTableCellContent__hoverItem .euiToolTipAnchor');

    await page.locator(byTestId(`deleteLocation-${locationId}`)).isDisabled();

    const text =
      'This location cannot be deleted, because it has 1 monitors running. Please remove this location from your monitors before deleting this location.';

    await page.locator(`text=${text}`).isVisible();
  });

  step('Delete location', async () => {
    await cleanTestMonitors(params);

    await page.click('text=Data Retention');
    expect(page.url()).toBe('http://localhost:5620/app/synthetics/settings/data-retention');
    await page.click('text=Private Locations');
    expect(page.url()).toBe('http://localhost:5620/app/synthetics/settings/private-locations');
    await page.click('[aria-label="Delete location"]');
    await page.click('button:has-text("Delete location")');
    await page.click('text=Create your first private location');
  });
});
