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
     * Reads the layout variant rendered by `CasesPageLayout`. `compact` is emitted by the redesign,
     * `legacy` by the old UI. The value is per-route (list/details/settings), so it reflects whichever
     * redesign flag applies to the current page.
     */
    async getActiveVariant(): Promise<'legacy' | 'compact' | 'fullHeight'> {
      const variant = await testSubjects.getAttribute('casesPageLayout', 'data-layout-variant');
      return (variant as 'legacy' | 'compact' | 'fullHeight' | null) ?? 'legacy';
    },

    /**
     * Whether the current cases page is rendered with the redesign (compact) layout.
     */
    async isRedesignEnabled(): Promise<boolean> {
      return (await this.getActiveVariant()) === 'compact';
    },

    /**
     * Waits for the case view page to load in either design (legacy `case-view-title` or the
     * redesign app header title).
     */
    async waitForCaseViewToLoad() {
      await retry.waitFor('the case view page to load', async () => {
        return (
          (await testSubjects.exists('case-view-title')) ||
          (await testSubjects.exists('appHeaderTitle'))
        );
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

      // The redesign renders the status as an app-header badge (`case-view-status-badge`), while the
      // legacy UI renders a popover button per status.
      if (await this.isRedesignEnabled()) {
        await testSubjects.existOrFail('case-view-status-badge');
        return;
      }

      await testSubjects.existOrFail(`case-status-badge-popover-button-${status}`);
    },

    async openCaseSetStatusDropdown() {
      // The redesign opens the status menu from the app-header badge; the legacy UI uses the action-bar
      // dropdown. Both expose the same `case-view-status-dropdown-${status}` menu items.
      if (await this.isRedesignEnabled()) {
        await testSubjects.click('case-view-status-badge');
        return;
      }

      const button = await find.byCssSelector(
        '[data-test-subj="case-view-status-dropdown"] button'
      );
      await button.click();
    },

    async assertRadioGroupValue(testSubject: string, expectedValue: string) {
      await retry.waitFor(
        `assertRadioGroupValue: Expected the radio group ${testSubject} to exists`,
        async () => {
          return await testSubjects.exists(testSubject);
        }
      );

      const assertRadioGroupValue = await testSubjects.find(testSubject);

      await retry.waitFor(
        `assertRadioGroupValue: Expected the radio group value to equal "${expectedValue}"`,
        async () => {
          const input = await assertRadioGroupValue.findByCssSelector(':checked');
          const selectedOptionId = await input.getAttribute('id');
          return selectedOptionId === expectedValue;
        }
      );
    },

    async selectRadioGroupValue(testSubject: string, value: string) {
      await retry.waitFor(
        `selectRadioGroupValue: Expected the radio group ${testSubject} to exists`,
        async () => {
          return await testSubjects.exists(testSubject);
        }
      );

      const radioGroup = await testSubjects.find(testSubject);

      const label = await radioGroup.findByCssSelector(`label[for="${value}"]`);
      await label.click();
      await header.waitUntilLoadingHasFinished();
      await this.assertRadioGroupValue(testSubject, value);
    },

    /**
     * Asserts the configured closure option regardless of design. The legacy UI uses a radio group
     * (`closure-options-radio-group`); the redesign uses a switch (`automatic-closure-switch`) where
     * checked means `close-by-pushing` and unchecked means `close-by-user`.
     */
    async assertClosureOption(expectedValue: 'close-by-user' | 'close-by-pushing') {
      if (await this.isRedesignEnabled()) {
        await retry.waitFor('assertClosureOption: closure switch to exist', async () => {
          return await testSubjects.exists('automatic-closure-switch');
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
        return;
      }

      await this.assertRadioGroupValue('closure-options-radio-group', expectedValue);
    },

    async selectClosureOption(value: 'close-by-user' | 'close-by-pushing') {
      if (await this.isRedesignEnabled()) {
        const checked = await testSubjects.getAttribute('automatic-closure-switch', 'aria-checked');
        const isPushing = checked === 'true';
        const shouldBePushing = value === 'close-by-pushing';

        if (isPushing !== shouldBePushing) {
          await testSubjects.click('automatic-closure-switch');
          await header.waitUntilLoadingHasFinished();
        }

        await this.assertClosureOption(value);
        return;
      }

      await this.selectRadioGroupValue('closure-options-radio-group', value);
    },

    async selectSeverity(severity: CaseSeverity) {
      await common.clickAndValidate(
        'case-severity-selection',
        `case-severity-selection-${severity}`
      );
      await testSubjects.click(`case-severity-selection-${severity}`);

      // The redesign sidebar stages the change and requires an explicit confirm before it is
      // submitted; the legacy UI commits on selection.
      if (await this.isRedesignEnabled()) {
        await testSubjects.click('template-field-confirm-severity');
        await header.waitUntilLoadingHasFinished();
      }
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
      await testSubjects.click('tag-list-edit-button');

      for (const [index, tag] of tags.entries()) {
        await comboBox.setCustom('comboBoxInput', `${tag}-${index}`);
      }

      await header.waitUntilLoadingHasFinished();
    },

    /**
     * Edits the case title from the case view page in either design. The legacy UI uses an inline
     * editable title with a submit button; the redesign edits the title in the app header, committing
     * on Enter with no submit button.
     */
    async editCaseTitle(newTitle: string) {
      if (await this.isRedesignEnabled()) {
        await testSubjects.click('appHeaderTitleButton');
        await testSubjects.setValue('appHeaderTitleInput', newTitle);
        await browser.pressKeys(browser.keys.ENTER);
        await header.waitUntilLoadingHasFinished();
        return;
      }

      await testSubjects.click('editable-title-header-value');
      await testSubjects.setValue('editable-title-input-field', newTitle);
      await testSubjects.click('editable-title-submit-btn');
      await header.waitUntilLoadingHasFinished();
    },

    /**
     * Asserts the case view title equals the expected value in either design (legacy
     * `editable-title-header-value` or the redesign `appHeaderTitle`).
     */
    async assertCaseTitle(expectedTitle: string) {
      const titleSubject = (await this.isRedesignEnabled())
        ? 'appHeaderTitle'
        : 'editable-title-header-value';

      await retry.tryForTime(5000, async () => {
        const title = await testSubjects.find(titleSubject);
        expect(await title.getVisibleText()).equal(expectedTitle);
      });
    },

    /**
     * Adds a category to a case from the case view sidebar in either design. The legacy UI opens an
     * edit form (`category-edit-button` + `edit-category-submit`); the redesign edits an always-visible
     * combo box (`categories-list`) confirmed via `template-field-confirm-category`.
     */
    async addCategory(category: string) {
      if (await this.isRedesignEnabled()) {
        await comboBox.setCustom('categories-list', category);
        await testSubjects.click('template-field-confirm-category');
        await header.waitUntilLoadingHasFinished();
        return;
      }

      await testSubjects.click('category-edit-button');
      await comboBox.setCustom('comboBoxInput', category);
      await testSubjects.click('edit-category-submit');
      await header.waitUntilLoadingHasFinished();
    },

    /**
     * Removes the category from a case in either design. The legacy UI has a dedicated remove button;
     * the redesign clears the combo box and confirms the change.
     */
    async removeCategory() {
      if (await this.isRedesignEnabled()) {
        await comboBox.clear('categories-list');
        await testSubjects.click('template-field-confirm-category');
        await header.waitUntilLoadingHasFinished();
        return;
      }

      await testSubjects.click('category-remove-button');
      await header.waitUntilLoadingHasFinished();
    },

    /**
     * Adds a tag to a case from the case view sidebar in either design. The legacy UI opens an edit
     * form (`tag-list-edit-button` + `edit-tags-submit`); the redesign edits an always-visible combo
     * box (`case-tags`) confirmed via `template-field-confirm-tags`.
     */
    async addTag(tag: string) {
      if (await this.isRedesignEnabled()) {
        await comboBox.setCustom('case-tags', tag);
        await testSubjects.click('template-field-confirm-tags');
        await header.waitUntilLoadingHasFinished();
        return;
      }

      await testSubjects.click('tag-list-edit-button');
      await comboBox.setCustom('comboBoxInput', tag);
      await testSubjects.click('edit-tags-submit');
      await header.waitUntilLoadingHasFinished();
    },
  };
}
