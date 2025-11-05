/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../ftr_provider_context';

export function LogRateAnalysisResultsGroupsTableProvider({ getService }: FtrProviderContext) {
  const find = getService('find');
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');
  const browser = getService('browser');

  return new (class AnalysisTable {
    public async assertLogRateAnalysisResultsTableExists() {
      await testSubjects.existOrFail(`aiopsLogRateAnalysisResultsGroupsTable`);
    }

    public async assertExpandRowButtonExists() {
      await testSubjects.existOrFail('aiopsLogRateAnalysisResultsGroupsTableRowExpansionButton');
    }

    public async expandRow() {
      await testSubjects.click('aiopsLogRateAnalysisResultsGroupsTableRowExpansionButton');
      await testSubjects.existOrFail('aiopsLogRateAnalysisResultsTable');
    }

    public async parseAnalysisTable() {
      const table = await testSubjects.find('~aiopsLogRateAnalysisResultsGroupsTable');
      const $ = await table.parseDomContent();
      const rows = [];

      for (const tr of $.findTestSubjects('~aiopsLogRateAnalysisResultsGroupsTableRow').toArray()) {
        const $tr = $(tr);

        const rowObject: {
          group: any;
          docCount: string;
        } = {
          group: $tr
            .findTestSubject('aiopsLogRateAnalysisResultsGroupsTableColumnGroup')
            .find('.euiTableCellContent')
            .text()
            .trim(),
          docCount: $tr
            .findTestSubject('aiopsLogRateAnalysisResultsGroupsTableColumnDocCount')
            .find('.euiTableCellContent')
            .text()
            .trim(),
        };

        rows.push(rowObject);
      }

      return rows;
    }

    public async scrollAnalysisTableIntoView() {
      await testSubjects.scrollIntoView('aiopsLogRateAnalysisResultsGroupsTable');
    }

    public rowSelector(rowId: string, subSelector?: string) {
      const row = `~aiopsLogRateAnalysisResultsGroupsTable > ~row-${rowId}`;
      return !subSelector ? row : `${row} > ${subSelector}`;
    }

    public async ensureActionsMenuOpen(rowId: string) {
      await retry.tryForTime(30 * 1000, async () => {
        await this.ensureActionsMenuClosed();

        if (!(await find.existsByCssSelector('.euiContextMenuPanel', 1000))) {
          await testSubjects.click(this.rowSelector(rowId, 'euiCollapsedItemActionsButton'));
          expect(await find.existsByCssSelector('.euiContextMenuPanel', 1000)).to.eql(
            true,
            'Actions popover should exist'
          );
        }
      });
    }

    public async ensureActionsMenuClosed() {
      await retry.tryForTime(30 * 1000, async () => {
        await browser.pressKeys(browser.keys.ESCAPE);
        expect(await find.existsByCssSelector('.euiContextMenuPanel', 1000)).to.eql(
          false,
          'Actions popover should not exist'
        );
      });
    }

    public async assertRowActions(rowId: string) {
      await this.ensureActionsMenuOpen(rowId);

      await testSubjects.existOrFail('aiopsTableActionButtonCopyToClipboard enabled');
      await testSubjects.existOrFail('aiopsTableActionButtonDiscover enabled');
      await testSubjects.existOrFail('aiopsTableActionButtonLogPatternAnalysis enabled');

      await this.ensureActionsMenuClosed();
    }

    public async clickRowAction(rowId: string, action: string) {
      await this.ensureActionsMenuOpen(rowId);
      await testSubjects.click(`aiopsTableActionButton${action} enabled`);
      await testSubjects.missingOrFail(`aiopsTableActionButton${action} enabled`);
    }
  })();
}
