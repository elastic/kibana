/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { journey, step, before } from '@elastic/synthetics';
import { assertNotText, assertText, byTestId, waitForLoadingToFinish } from '../utils';
import { settingsPageProvider } from '../../page_objects/settings';

journey('DefaultEmailSettings', async ({ page, params }) => {
  const settings = settingsPageProvider({ page, kibanaUrl: params.kibanaUrl });

  before(async () => {
    await waitForLoadingToFinish({ page });
  });

  const queryParams = new URLSearchParams({
    dateRangeStart: '2021-11-21T22:06:06.502Z',
    dateRangeEnd: '2021-11-21T22:10:08.203Z',
  }).toString();

  const baseUrl = `${params.kibanaUrl}/app/uptime/settings`;

  step('Go to uptime', async () => {
    await page.goto(`${baseUrl}?${queryParams}`, {
      waitUntil: 'networkidle',
    });
    await settings.loginToKibana();
  });

  step('clear existing settings', async () => {
    await settings.dismissSyntheticsCallout();
    await page.waitForSelector(byTestId('"default-connectors-input-loaded"'));
    await page.waitForTimeout(10 * 1000);
    const toEmailInput = await page.$(byTestId('toEmailAddressInput'));

    if (toEmailInput !== null) {
      await page.click(`${byTestId('toEmailAddressInput')} >> ${byTestId('comboBoxClearButton')}`);
      await page.click(
        `${byTestId('"default-connectors-input-loaded"')} >> ${byTestId('comboBoxClearButton')}`
      );
      await settings.saveSettings();
    }
  });

  step('Add email connector', async () => {
    await page.click(byTestId('createConnectorButton'));
    await page.click(byTestId('".email-card"'));
    await page.fill(byTestId('nameInput'), 'Test connector');
    await page.fill(byTestId('emailFromInput'), 'test@gmail.com');

    await page.selectOption(byTestId('emailServiceSelectInput'), 'other');
    await page.fill(byTestId('emailHostInput'), 'test');
    await page.fill(byTestId('emailPortInput'), '1025');
    await page.click('text=Require authentication for this server');
    await page.click(byTestId('saveNewActionButton'));
  });

  step('Select email connector', async () => {
    await assertNotText({ page, text: 'Bcc' });
    await page.click(byTestId('default-connectors-input-loaded'));
    await page.click(byTestId('"Test connector"'));

    await assertText({ page, text: 'Bcc' });

    await settings.assertText({ text: 'To email is required for email connector' });

    await settings.assertApplyDisabled();

    await settings.fillToEmail('test@gmail.com');

    await settings.assertApplyEnabled();
  });

  step('Checks for invalid email', async () => {
    await settings.fillToEmail('test@gmail');

    await settings.assertText({ text: 'test@gmail is not a valid email.' });

    await settings.assertApplyDisabled();
    await settings.removeInvalidEmail('test@gmail');
  });

  step('Save settings', async () => {
    await settings.saveSettings();
  });
});
