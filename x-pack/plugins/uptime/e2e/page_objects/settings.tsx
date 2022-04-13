/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect, Page } from '@elastic/synthetics';
import { loginPageProvider } from './login';
import { utilsPageProvider } from './utils';
import { byTestId } from '../journeys/utils';

export function settingsPageProvider({ page }: { page: Page; kibanaUrl: string }) {
  return {
    ...loginPageProvider({ page }),
    ...utilsPageProvider({ page }),

    async fillToEmail(text: string) {
      await page.fill(
        '[data-test-subj=toEmailAddressInput] >> [data-test-subj=comboBoxSearchInput]',
        text
      );

      await page.click(byTestId('uptimeSettingsPage'));
    },
    async saveSettings() {
      await page.click(byTestId('apply-settings-button'));
      await this.waitForLoadingToFinish();
      await this.assertText({ text: 'Settings saved!' });
    },
    async assertApplyEnabled() {
      expect(await page.isEnabled(byTestId('apply-settings-button'))).toBeTruthy();
    },
    async assertApplyDisabled() {
      expect(await page.isEnabled(byTestId('apply-settings-button'))).toBeFalsy();
    },
    async removeInvalidEmail(invalidEmail: string) {
      await page.click(`[title="Remove ${invalidEmail} from selection in this group"]`);
    },
  };
}
