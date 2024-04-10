/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { journey, step, before, after, expect } from '@elastic/synthetics';
import { waitForLoadingToFinish } from '@kbn/ux-plugin/e2e/journeys/utils';
import { byTestId } from '../../helpers/utils';
import { recordVideo } from '../../helpers/record_video';
import {
  addTestMonitor,
  cleanPrivateLocations,
  cleanTestMonitors,
  getPrivateLocations,
} from './services/add_monitor';
import { syntheticsAppPageProvider } from '../page_objects/synthetics_app';

journey(`PrivateLocationsSettings`, async ({ page, params }) => {
  recordVideo(page);

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

  step('Private location settings is working as expected', async () => {
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

  step('Integration cannot be edited in Fleet', async () => {
    await page.goto(`${params.kibanaUrl}/app/integrations/detail/synthetics/policies`);
    await page.waitForSelector('h1:has-text("Elastic Synthetics")');

    await page.click('text="test-monitor-Test private-default"');
    await page.waitForSelector('h1:has-text("Edit Elastic Synthetics integration")');
    await page.waitForSelector('text="This package policy is managed by the Synthetics app."');
  });

  step('Integration edit button leads to correct Synthetics edit page', async () => {
    await page.click('text="Edit in Synthetics"');

    await page.waitForSelector('h1:has-text("Edit Monitor")');
    await page.waitForSelector('h2:has-text("Monitor details")');
    expect(await page.inputValue('[data-test-subj="syntheticsMonitorConfigName"]')).toBe(
      'test-monitor'
    );
  });

  step('Private location cannot be deleted when a monitor is assigned to it', async () => {
    await page.click('[data-test-subj="settings-page-link"]');
    await page.click('h1:has-text("Settings")');
    await page.click('text=Private Locations');
    await page.waitForSelector('td:has-text("1")');
    await page.waitForSelector('td:has-text("Test private")');
    await page.click('.euiTableRowCell .euiToolTipAnchor');
    await page.click('button:has-text("Tags")');
    await page.click('[aria-label="Tags"] >> text=Area51');
    await page.click(
      'main div:has-text("Private locations allow you to run monitors from your own premises. They require")'
    );
    await page.click('text=Test private');

    await page.click('.euiTableRowCell .euiToolTipAnchor');

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

  step('login with non super user', async () => {
    await page.click('[data-test-subj="userMenuAvatar"]');
    await page.click('text="Log out"');
    await syntheticsApp.loginToKibana('viewer', 'changeme');
  });

  step('viewer user cannot add locations', async () => {
    await syntheticsApp.navigateToSettings(false);
    await page.click('text=Private Locations');
    await page.hover(byTestId('syntheticsEmptyLocationsButton'), { force: true });
    await page.waitForSelector(
      `text="You do not have sufficient permissions to perform this action."`
    );
    const createLocationBtn = await page.getByRole('button', { name: 'Create location' });
    expect(await createLocationBtn.getAttribute('disabled')).toEqual('');
  });
});
