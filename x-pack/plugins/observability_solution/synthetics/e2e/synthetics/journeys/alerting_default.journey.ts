/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { journey, step, expect, before, after } from '@elastic/synthetics';
import { recordVideo } from '../../helpers/record_video';
import { byTestId } from '../../helpers/utils';
import { syntheticsAppPageProvider } from '../page_objects/synthetics_app';
import { cleanSettings } from './services/settings';

journey('AlertingDefaults', async ({ page, params }) => {
  recordVideo(page);

  const syntheticsApp = syntheticsAppPageProvider({ page, kibanaUrl: params.kibanaUrl });

  page.setDefaultTimeout(60 * 1000);

  before(async () => {
    await cleanSettings(params);
  });

  after(async () => {
    await cleanSettings(params);
  });

  step('Login to kibana', async () => {
    await page.goto('http://localhost:5620/login?next=%2F');
    await syntheticsApp.loginToKibana();
  });

  step('Go to Settings page', async () => {
    await page.click('[aria-label="Toggle primary navigation"]');
    await page.click('text=Synthetics');
    await page.click('text=Settings');
  });

  step('Click text=Synthetics', async () => {
    expect(page.url()).toBe('http://localhost:5620/app/synthetics/settings/alerting');
    await page.click('.euiComboBox__inputWrap');
    await page.click("text=There aren't any options available");
    await page.click('button:has-text("Add connector")');
    await page.click('p:has-text("Slack")');
    await page.click('input[type="text"]');
    await page.fill('input[type="text"]', 'Test slack');
    await page.press('input[type="text"]', 'Tab');
  });
  step(
    'Fill text=Webhook URLCreate a Slack Webhook URL(opens in a new tab or window) >> input[type="text"]',
    async () => {
      if (await page.isVisible(byTestId('webhookButton'))) {
        await page.click(byTestId('webhookButton'));
      }
      await page.fill(
        'text=Webhook URLCreate a Slack Webhook URL(opens in a new tab or window) >> input[type="text"]',
        'https://www.slack.com'
      );
      await page.click('button:has-text("Save")');
      await page.click('.euiComboBox__inputWrap');
      await page.click('button[role="option"]:has-text("Test slack")');
      await page.click("text=You've selected all available options");
      await page.click('button:has-text("Apply changes")');
      await page.click('[aria-label="Remove Test slack from selection in this group"]');
      await page.isDisabled('button:has-text("Discard changes")');
      await page.click('button:has-text("Add connector")');
    }
  );
  step('Click text=Email', async () => {
    await page.click('text=Email');
    await page.click('input[type="text"]');
    await page.fill('input[type="text"]', 'Test email');
    await page.press('input[type="text"]', 'Tab');
    await page.selectOption('select', 'gmail');
    await page.click('text=UsernamePassword >> input[type="text"]');
    await page.fill('text=UsernamePassword >> input[type="text"]', 'elastic');
    await page.press('text=UsernamePassword >> input[type="text"]', 'Tab');
    await page.fill('input[type="password"]', 'changeme');
    await page.click('button:has-text("Save")');
    await page.click(
      'text=Sender is required.Configure email accounts(opens in a new tab or window) >> input[type="text"]'
    );
    await page.fill(
      'text=Sender is required.Configure email accounts(opens in a new tab or window) >> input[type="text"]',
      'test@gmail.com'
    );
    await page.click('button:has-text("Save")');
  });
  step('Click .euiComboBox__inputWrap', async () => {
    await page.click('.euiComboBox__inputWrap');
    await page.click('button[role="option"]:has-text("Test email")');
    await page.click(byTestId('toEmailAddressInput'));
    await page.fill(
      'text=To CcBccCombo box. Selected. Combo box input. Type some text or, to display a li >> input[role="combobox"]',
      'test@gmail.com'
    );
    await page.keyboard.press('Enter');
    await page.fill(
      'text=test@gmail.comCombo box. Selected. test@gmail.com. Press Backspace to delete tes >> input[role="combobox"]',
      'tesyt'
    );
    await page.keyboard.press('Enter');

    await page.click('[aria-label="Remove tesyt from selection in this group"]');
    await page.click('button:has-text("Cc")');
    await page.click(byTestId('ccEmailAddressInput'));

    await page.fill(`${byTestId('ccEmailAddressInput')} >> input[role="combobox"]`, 'wow');
    await page.keyboard.press('Enter');
  });
  step('Click text=wow is not a valid email.', async () => {
    await page.click('text=wow is not a valid email.');
    await page.click('text=wowwow is not a valid email. >> [aria-label="Clear input"]');
    await page.fill(`${byTestId('ccEmailAddressInput')} >> input[role="combobox"]`, 'list');
    await page.click(
      'text=Default emailEmail settings required for selected email alert connectors.To Bcct'
    );
    await page.click('[aria-label="Remove list from selection in this group"]');
    await page.click(
      'text=Default emailEmail settings required for selected email alert connectors.To Bcct'
    );
    await page.click('text=To Bcctest@gmail.com >> [aria-label="Clear input"]');
    await page.click('.euiForm');
    await page.click('text=To: Email is required for selected email connector');
  });
  step(
    'Click .euiComboBox.euiComboBox--fullWidth.euiComboBox-isInvalid .euiFormControlLayout .euiFormControlLayout__childrenWrapper .euiComboBox__inputWrap',
    async () => {
      await page.click(
        '.euiComboBox.euiComboBox--fullWidth.euiComboBox-isInvalid .euiFormControlLayout .euiFormControlLayout__childrenWrapper .euiComboBox__inputWrap'
      );
      await page.fill(
        'text=To BccCombo box. Selected. Combo box input. Type some text or, to display a list >> input[role="combobox"]',
        'test@gmail.com'
      );
      await page.isDisabled('button:has-text("Apply changes")');
      await page.click('[aria-label="Account menu"]');
      await page.click('text=Log out');
    }
  );

  step('Login to kibana with readonly', async () => {
    await syntheticsApp.loginToKibana('viewer', 'changeme');
  });

  step('Go to http://localhost:5620/app/synthetics/settings/alerting', async () => {
    await page.goto('http://localhost:5620/app/synthetics/settings/alerting', {
      waitUntil: 'networkidle',
    });
    await page.isDisabled('.euiComboBox__inputWrap');
    await page.isDisabled('button:has-text("Apply changes")');
    await page.isDisabled('button:has-text("Add connector")');
  });
});
