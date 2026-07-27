/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrProviderContext } from '../../ftr_provider_context';

export function TransformSourceSelectionProvider({ getService }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');

  return {
    async assertSourceListContainsEntry(sourceName: string) {
      const dataViewSwitcher = await testSubjects.find('indexPattern-switcher');
      await dataViewSwitcher.findByCssSelector(`[data-test-subj="dataView-${sourceName}"]`);
    },

    async filterSourceSelection(sourceName: string) {
      await testSubjects.click('transformDataViewPicker');
      await testSubjects.existOrFail('indexPattern-switcher', { timeout: 10 * 1000 });
      await testSubjects.setValue('indexPattern-switcher--input', sourceName, {
        clearWithKeyboard: true,
      });
      await this.assertSourceListContainsEntry(sourceName);
    },

    async selectSource(sourceName: string) {
      await this.filterSourceSelection(sourceName);
      await retry.tryForTime(30 * 1000, async () => {
        const dataViewSwitcher = await testSubjects.find('indexPattern-switcher');
        await (
          await dataViewSwitcher.findByCssSelector(`[data-test-subj="dataView-${sourceName}"]`)
        ).click();
        await testSubjects.missingOrFail('indexPattern-switcher', { timeout: 10 * 1000 });
        await testSubjects.existOrFail('transformPageCreateTransform', { timeout: 10 * 1000 });
      });
    },
  };
}
