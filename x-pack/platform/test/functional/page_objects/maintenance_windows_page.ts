/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../ftr_provider_context';

const ENTER_KEY = '\uE007';

export function MaintenanceWindowsPageProvider({ getService }: FtrProviderContext) {
  const find = getService('find');

  return {
    async getMaintenanceWindowsList() {
      const table = await find.byCssSelector('[data-test-subj="maintenance-windows-table"] table');
      const $ = await table.parseDomContent();
      return $.findTestSubjects('list-item')
        .toArray()
        .map((row) => {
          return {
            status: $(row)
              .findTestSubject('maintenance-windows-column-status')
              .find('.euiTableCellContent')
              .text(),
          };
        });
    },
    async searchMaintenanceWindows(searchText: string) {
      const searchBox = await find.byCssSelector(
        '.euiFieldSearch:not(.euiSelectableTemplateSitewide__search)'
      );
      await searchBox.click();
      await searchBox.clearValue();
      await searchBox.type(searchText);
      await searchBox.pressKeys(ENTER_KEY);
      await find.byCssSelector(
        '.euiBasicTable[data-test-subj="maintenance-windows-table"]:not(.euiBasicTable-loading)'
      );
    },
  };
}
