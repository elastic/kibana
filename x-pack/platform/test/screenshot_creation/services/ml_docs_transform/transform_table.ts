/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import type { WebElementWrapper } from '@kbn/ftr-common-functional-ui-services';

import type { FtrProviderContext } from '../../ftr_provider_context';

type TransformRowActionName =
  | 'Clone'
  | 'Delete'
  | 'Discover'
  | 'Edit'
  | 'Reset'
  | 'Start'
  | 'Stop'
  | 'Reauthorize';

export function TransformTableProvider({ getPageObject, getService }: FtrProviderContext) {
  const find = getService('find');
  const retry = getService('retry');
  const testSubjects = getService('testSubjects');
  const commonPage = getPageObject('common');
  const browser = getService('browser');

  return new (class TransformTable {
    public async parseTransformTable() {
      const table = await testSubjects.find('~transformListTable');
      const $ = await table.parseDomContent();
      const rows = [];

      for (const tr of $.findTestSubjects('~transformListRow').toArray()) {
        const $tr = $(tr);
        const $executionCell = $tr.findTestSubject('transformListColumnExecution');
        const $progressCell = $tr.findTestSubject('transformListColumnProgress');
        const execution = $executionCell.find('.euiTableCellContent').text().trim();

        rows.push({
          id: $tr
            .findTestSubject('transformListColumnId')
            .findTestSubject('transformListColumnIdText')
            .text()
            .trim(),
          description: $tr.findTestSubject('transformListColumnDescriptionText').text().trim(),
          type: $tr
            .findTestSubject('transformListColumnType')
            .find('.euiTableCellContent')
            .text()
            .trim()
            .toLowerCase(),
          status: $tr
            .findTestSubject('transformListColumnStatus')
            .find('.euiTableCellContent')
            .text()
            .trim()
            .toLowerCase(),
          mode: execution === 'Continuous' ? 'continuous' : 'batch',
          progress: $progressCell.findTestSubject('transformListProgress').attr('value'),
          health: $tr
            .findTestSubject('transformListColumnHealth')
            .findTestSubject('transformListHealth')
            .text()
            .trim(),
        });
      }

      return rows;
    }

    public async waitForRefreshButtonLoaded() {
      await testSubjects.existOrFail('~transformRefreshTransformListButton', {
        timeout: 10 * 1000,
      });
      await testSubjects.existOrFail('transformRefreshTransformListButton loaded', {
        timeout: 30 * 1000,
      });
    }

    public async refreshTransformList() {
      await this.waitForRefreshButtonLoaded();
      await testSubjects.click('~transformRefreshTransformListButton');
      await this.waitForRefreshButtonLoaded();
      await this.waitForTransformsTableToLoad();
    }

    public async waitForTransformsTableToStartLoading() {
      await testSubjects.existOrFail(`~transformListTable`, { timeout: 60 * 1000 });

      // After invoking an action that caused the table to start loading, the loading
      // should start quickly after the table exists. Sometimes it is even so quick that
      // the loading is already done when we try to check for it, so we're not failing
      // in that case and just move on.
      await testSubjects.waitForExists(`transformListTable loading`, { timeout: 3 * 1000 });
    }

    public async waitForTransformsTableToLoad() {
      await testSubjects.existOrFail('~transformListTable', { timeout: 60 * 1000 });
      await testSubjects.existOrFail('transformListTable loaded', { timeout: 30 * 1000 });
    }

    async getSearchInput(): Promise<WebElementWrapper> {
      const tableListContainer = await testSubjects.find('transformListTableContainer');
      return await tableListContainer.findByClassName('euiFieldSearch');
    }

    public async assertSearchInputValue(expectedSearchValue: string) {
      const searchBarInput = await this.getSearchInput();
      const actualSearchValue = await searchBarInput.getAttribute('value');
      expect(actualSearchValue).to.eql(
        expectedSearchValue,
        `Search input value should be '${expectedSearchValue}' (got '${actualSearchValue}')`
      );
    }

    public async filterWithSearchString(filter: string, expectedRowCount: number = 1) {
      await this.waitForTransformsTableToLoad();
      const searchBarInput = await this.getSearchInput();
      await searchBarInput.clearValueWithKeyboard();
      await searchBarInput.type(filter);
      await commonPage.pressEnterKey();
      await this.assertSearchInputValue(filter);
      await this.waitForTransformsTableToStartLoading();
      await this.waitForTransformsTableToLoad();

      const rows = await this.parseTransformTable();
      const filteredRows = rows.filter((row) => row.id === filter);
      expect(filteredRows).to.have.length(
        expectedRowCount,
        `Filtered Transform table should have ${expectedRowCount} row(s) for filter '${filter}' (got matching items '${filteredRows}')`
      );
    }

    public rowSelector(transformId: string, subSelector?: string) {
      const row = `~transformListTable > ~row-${transformId}`;
      return !subSelector ? row : `${row} > ${subSelector}`;
    }

    public async ensureTransformActionsMenuOpen(transformId: string) {
      await retry.tryForTime(30 * 1000, async () => {
        await this.ensureTransformActionsMenuClosed();

        if (!(await find.existsByCssSelector('.euiContextMenuPanel', 1000))) {
          await testSubjects.click(this.rowSelector(transformId, 'euiCollapsedItemActionsButton'));
          expect(await find.existsByCssSelector('.euiContextMenuPanel', 1000)).to.eql(
            true,
            'Actions popover should exist'
          );
        }
      });
    }

    public async ensureTransformActionsMenuClosed() {
      await retry.tryForTime(30 * 1000, async () => {
        await browser.pressKeys(browser.keys.ESCAPE);
        expect(await find.existsByCssSelector('.euiContextMenuPanel', 1000)).to.eql(
          false,
          'Actions popover should not exist'
        );
      });
    }

    public async assertTransformRowActions(transformId: string, isTransformRunning = false) {
      await this.ensureTransformActionsMenuOpen(transformId);

      await testSubjects.existOrFail('transformActionClone');
      await testSubjects.existOrFail('transformActionDelete');
      await testSubjects.existOrFail('transformActionDiscover');
      await testSubjects.existOrFail('transformActionEdit');
      await testSubjects.existOrFail('transformActionReset');

      if (isTransformRunning) {
        await testSubjects.missingOrFail('transformActionStart');
        await testSubjects.existOrFail('transformActionStop');
      } else {
        await testSubjects.existOrFail('transformActionStart');
        await testSubjects.missingOrFail('transformActionStop');
      }

      await this.ensureTransformActionsMenuClosed();
    }

    public async clickTransformRowAction(transformId: string, action: TransformRowActionName) {
      await this.ensureTransformActionsMenuOpen(transformId);
      await testSubjects.click(`transformAction${action}`);
      await testSubjects.missingOrFail(`transformAction${action}`);
    }
  })();
}
