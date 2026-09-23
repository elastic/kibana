/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { ProvidedType } from '@kbn/test';
import type { CaseSeverity, CaseStatuses } from '@kbn/cases-plugin/common/types/domain';
import type { FtrProviderContext } from '../../ftr_provider_context';

export type CasesCommon = ProvidedType<typeof CasesCommonServiceProvider>;

export function CasesCommonServiceProvider({ getService, getPageObject }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const find = getService('find');
  const header = getPageObject('header');
  const common = getPageObject('common');
  const toasts = getService('toasts');
  const retry = getService('retry');
  const comboBox = getService('comboBox');
  const browser = getService('browser');

  return {
    /**
     * Reveals the legacy custom-fields section on Create Case / Settings / Case Details.
     * Templates v2 hides it behind a per-owner local-storage switch (default off); flipping
     * it on keeps legacy custom-field coverage valid regardless of the templates flag. No-op
     * when templates is off (legacy fields are always shown). Requires the cases app origin
     * to be loaded first (e.g. after navigating to the app).
     */
    async showLegacyCustomFields(owner: string): Promise<void> {
      await browser.setLocalStorageItem(`${owner}.cases.showLegacyCustomFields`, 'true');
    },

    async waitForCaseViewToLoad() {
      await retry.waitFor('the case view page to load', async () => {
        return testSubjects.exists('appHeaderTitle');
      });
    },

    /**
     * Opens the create case page pressing the "create case" button.
     *
     * Doesn't do navigation. Only works if you are already inside a cases app page.
     * Does not work with the cases flyout.
     */
    async openCreateCasePage() {
      await testSubjects.click('createNewCaseBtn');
      await testSubjects.existOrFail('create-case-submit', {
        timeout: 5000,
      });
    },

    async changeCaseStatusViaDropdownAndVerify(status: CaseStatuses) {
      await this.openCaseSetStatusDropdown();
      await testSubjects.click(`case-view-status-dropdown-${status}`);
      await header.waitUntilLoadingHasFinished();
      await testSubjects.existOrFail('case-view-status-badge');
    },

    async openCaseSetStatusDropdown() {
      await testSubjects.click('case-view-status-badge');
    },

    async assertClosureOption(expectedValue: 'close-by-user' | 'close-by-pushing') {
      await retry.waitFor('assertClosureOption: closure switch to exist', async () => {
        return testSubjects.exists('automatic-closure-switch');
      });
      await retry.waitFor(
        `assertClosureOption: closure switch to reflect "${expectedValue}"`,
        async () => {
          const checked = await testSubjects.getAttribute(
            'automatic-closure-switch',
            'aria-checked'
          );
          const isPushing = checked === 'true';
          return expectedValue === 'close-by-pushing' ? isPushing : !isPushing;
        }
      );
    },

    async selectClosureOption(value: 'close-by-user' | 'close-by-pushing') {
      const checked = await testSubjects.getAttribute('automatic-closure-switch', 'aria-checked');
      const isPushing = checked === 'true';
      const shouldBePushing = value === 'close-by-pushing';

      if (isPushing !== shouldBePushing) {
        await testSubjects.click('automatic-closure-switch');
        await header.waitUntilLoadingHasFinished();
      }

      await this.assertClosureOption(value);
    },

    async selectSeverity(severity: CaseSeverity) {
      await common.clickAndValidate(
        'case-severity-selection',
        `case-severity-selection-${severity}`
      );
      await testSubjects.click(`case-severity-selection-${severity}`);
      await header.waitUntilLoadingHasFinished();
    },

    async expectToasterToContain(content: string) {
      await retry.try(async () => {
        const toast = await toasts.getElementByIndex(1);
        const text = await toast.getVisibleText();
        expect(text).to.contain(content);
      });
    },

    async assertCaseModalVisible(expectVisible = true) {
      await retry.tryForTime(5000, async () => {
        if (expectVisible) {
          await testSubjects.existOrFail('all-cases-modal');
        } else {
          await testSubjects.missingOrFail('all-cases-modal');
        }
      });
    },

    async setSearchTextInAssigneesPopover(text: string) {
      await (
        await (await find.byClassName('euiContextMenuPanel')).findByClassName('euiFieldSearch')
      ).type(text);
      await header.waitUntilLoadingHasFinished();
    },

    async selectFirstRowInAssigneesPopover() {
      await (await find.byClassName('euiSelectableListItem__content')).click();
      await header.waitUntilLoadingHasFinished();
    },

    async selectAllRowsInAssigneesPopover() {
      const rows = await find.allByCssSelector('.euiSelectableListItem__content');
      for (const row of rows) {
        await row.click();
      }

      await header.waitUntilLoadingHasFinished();
    },

    async selectRowsInAssigneesPopover(indexes: number[]) {
      const rows = await find.allByCssSelector('.euiSelectableListItem__content');
      for (const [index, row] of rows.entries()) {
        if (indexes.includes(index)) {
          await row.click();
        }
      }

      await header.waitUntilLoadingHasFinished();
    },

    async addMultipleTags(tags: string[]) {
      for (const [index, tag] of tags.entries()) {
        await comboBox.setCustom('case-tags', `${tag}-${index}`);
        await header.waitUntilLoadingHasFinished();
      }
    },

    async editCaseTitle(newTitle: string) {
      await testSubjects.click('appHeaderTitleButton');
      await testSubjects.setValue('appHeaderTitleInput', newTitle);
      await browser.pressKeys(browser.keys.ENTER);
      await header.waitUntilLoadingHasFinished();
    },

    async assertCaseTitle(expectedTitle: string) {
      await retry.tryForTime(5000, async () => {
        const title = await testSubjects.find('appHeaderTitle');
        expect(await title.getVisibleText()).equal(expectedTitle);
      });
    },

    async addCategory(category: string) {
      await comboBox.setCustom('categories-list', category);
      await header.waitUntilLoadingHasFinished();
    },

    async removeCategory() {
      await comboBox.clear('categories-list');
      await header.waitUntilLoadingHasFinished();
    },

    async addTag(tag: string) {
      await comboBox.setCustom('case-tags', tag);
      await header.waitUntilLoadingHasFinished();
    },
  };
}
