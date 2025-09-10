/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { ALL_COMMON_SETTINGS } from '@kbn/serverless-common-settings';
import * as settings from '@kbn/management-settings-ids';
import { FtrProviderContext } from '../../../ftr_provider_context';

const editorSettings = new Set<string>([
  settings.BANNERS_TEXT_CONTENT_ID,
  settings.DATE_FORMAT_SCALED_ID,
  settings.ML_ANOMALY_DETECTION_RESULTS_TIME_DEFAULTS_ID,
  settings.NOTIFICATIONS_BANNER_ID,
  settings.TIMEPICKER_TIME_DEFAULTS_ID,
  settings.TIMEPICKER_QUICK_RANGES_ID,
  settings.SECURITY_SOLUTION_REFRESH_INTERVAL_DEFAULTS_ID,
  settings.SECURITY_SOLUTION_TIME_DEFAULTS_ID,
  settings.SECURITY_SOLUTION_RULES_TABLE_REFRESH_ID,
  settings.SECURITY_SOLUTION_IP_REPUTATION_LINKS_ID,
  settings.OBSERVABILITY_APM_AWS_LAMBDA_PRICE_FACTOR_ID,
]);
export const isEditorFieldSetting = (settingId: string) => editorSettings.has(settingId);

const SAVE_BUTTON_TEST_SUBJ = 'settings-save-button';
const PAGE_RELOAD_BUTTON_TEST_SUBJ = 'pageReloadButton';

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const testSubjects = getService('testSubjects');
  const pageObjects = getPageObjects(['svlCommonPage', 'common']);
  const browser = getService('browser');
  const retry = getService('retry');
  const kibanaServer = getService('kibanaServer');
  let INITIAL_CSV_QUOTE_VALUES_SETTING_VALUE: any;

  // FLAKY: https://github.com/elastic/kibana/issues/172990
  describe.skip('Common advanced settings', function () {
    // the suite is flaky on MKI
    this.tags(['failsOnMKI']);
    before(async () => {
      INITIAL_CSV_QUOTE_VALUES_SETTING_VALUE = await kibanaServer.uiSettings.get('csv:quoteValues');
      // Setting the `csv:quoteValues` setting to its default value
      await kibanaServer.uiSettings.update({
        'csv:quoteValues': true,
      });
      await pageObjects.svlCommonPage.loginAsAdmin();
      await pageObjects.common.navigateToApp('settings');
    });

    after(async () => {
      // Resetting the `csv:quoteValues` setting to its initial value
      await kibanaServer.uiSettings.update({
        'csv:quoteValues': INITIAL_CSV_QUOTE_VALUES_SETTING_VALUE,
      });
    });

    it('renders the page', async () => {
      await retry.waitFor('title to be visible', async () => {
        return await testSubjects.exists('managementSettingsTitle');
      });

      const url = await browser.getCurrentUrl();
      expect(url).to.contain(`/settings`);
    });

    describe('renders common settings', () => {
      for (const settingId of ALL_COMMON_SETTINGS) {
        // Code editors don't have their test subjects rendered
        if (isEditorFieldSetting(settingId)) {
          continue;
        }
        const isColorPickerField =
          settingId === settings.BANNERS_TEXT_COLOR_ID ||
          settingId === settings.BANNERS_BACKGROUND_COLOR_ID;
        const fieldTestSubj =
          (isColorPickerField ? 'euiColorPickerAnchor ' : '') +
          'management-settings-editField-' +
          settingId;
        it('renders ' + settingId + ' edit field', async () => {
          expect(await testSubjects.exists(fieldTestSubj)).to.be(true);
        });
      }
    });

    describe('updating settings', () => {
      it('allows to update a setting', async () => {
        const fieldTestSubj = 'management-settings-editField-' + settings.CSV_QUOTE_VALUES_ID;
        expect(await testSubjects.isEuiSwitchChecked(fieldTestSubj)).to.be(true);
        await testSubjects.click(fieldTestSubj);

        await retry.waitFor('field to be unchecked', async () => {
          return !(await testSubjects.isEuiSwitchChecked(fieldTestSubj));
        });

        // Save changes
        await testSubjects.click(SAVE_BUTTON_TEST_SUBJ);

        await pageObjects.common.sleep(2000);
        await browser.refresh();

        // Check if field is now disabled
        expect(await testSubjects.isEuiSwitchChecked(fieldTestSubj)).to.be(false);
      });

      it('allows resetting a setting to its default value', async () => {
        const fieldTestSubj = 'management-settings-editField-' + settings.CSV_QUOTE_VALUES_ID;
        const resetLinkTestSubj = 'management-settings-resetField-' + settings.CSV_QUOTE_VALUES_ID;
        expect(await testSubjects.exists(resetLinkTestSubj)).to.be(true);
        await testSubjects.click(resetLinkTestSubj);

        await retry.waitFor('reset link to be hidden', async () => {
          return !(await testSubjects.exists(resetLinkTestSubj));
        });

        // Save changes
        await testSubjects.click(SAVE_BUTTON_TEST_SUBJ);

        await pageObjects.common.sleep(2000);
        await browser.refresh();

        // Check if field is now enabled
        expect(await testSubjects.isEuiSwitchChecked(fieldTestSubj)).to.be(true);
      });

      it('renders a page reload toast when updating a setting that requires page reload', async () => {
        const fieldTestSubj =
          'management-settings-editField-' + settings.ACCESSIBILITY_DISABLE_ANIMATIONS_ID;
        const fieldEnabled = await testSubjects.isEuiSwitchChecked(fieldTestSubj);
        await testSubjects.click(fieldTestSubj);
        await pageObjects.common.sleep(2000);

        // Save changes
        await testSubjects.click(SAVE_BUTTON_TEST_SUBJ);

        expect(await testSubjects.exists(PAGE_RELOAD_BUTTON_TEST_SUBJ)).to.be(true);
        await testSubjects.click(PAGE_RELOAD_BUTTON_TEST_SUBJ);
        await pageObjects.common.sleep(2000);

        // Reset setting to its initial value
        await testSubjects.click(fieldTestSubj);
        await testSubjects.click(SAVE_BUTTON_TEST_SUBJ);
        await testSubjects.click(PAGE_RELOAD_BUTTON_TEST_SUBJ);
        await pageObjects.common.sleep(1000);
        expect(await testSubjects.isEuiSwitchChecked(fieldTestSubj)).to.be(fieldEnabled);
      });

      it("doesn't allow setting an invalid value", async () => {
        const fieldTestSubj = 'management-settings-editField-' + settings.DEFAULT_COLUMNS_ID;
        // The Default columns setting allows maximum 50 columns, so we set more than this
        const invalidValue = new Array(51).fill('test').toString();
        await testSubjects.setValue(fieldTestSubj, invalidValue);
        await pageObjects.common.sleep(2000);

        // Check if the Save button is disabled
        expect(await testSubjects.isEnabled(SAVE_BUTTON_TEST_SUBJ)).to.be(false);
      });
    });
  });
};
