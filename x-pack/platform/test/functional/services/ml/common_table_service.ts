/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { WebElementWrapper } from '@kbn/ftr-common-functional-ui-services';
import { FtrProviderContext } from '../../ftr_provider_context';

export type MlTableService = ReturnType<typeof MlTableServiceProvider>;

export function MlTableServiceProvider({ getPageObject, getService }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const commonPage = getPageObject('common');
  const retry = getService('retry');

  const TableService = class {
    constructor(
      public readonly tableTestSubj: string,
      public readonly tableRowSubj: string,
      public readonly columns: Array<{ id: string; testSubj: string }>,
      public readonly searchInputSubj: string,
      public readonly parentSubj?: string
    ) {}

    public async assertTableLoaded() {
      await testSubjects.existOrFail(`~${this.tableTestSubj} loaded`);
    }

    public async assertTableLoading() {
      await testSubjects.existOrFail(`~${this.tableTestSubj} loading`);
    }

    public async parseTable() {
      const table = await testSubjects.find(
        `${this.parentSubj ? `${this.parentSubj} > ` : ''}~${this.tableTestSubj}`
      );
      const $ = await table.parseDomContent();
      const rows = [];

      for (const tr of $.findTestSubjects(`~${this.tableRowSubj}`).toArray()) {
        const $tr = $(tr);

        const rowObject = this.columns.reduce((acc, curr) => {
          acc[curr.id] = $tr
            .findTestSubject(curr.testSubj)
            .find('.euiTableCellContent')
            .text()
            .trim();
          return acc;
        }, {} as Record<(typeof this.columns)[number]['id'], string>);

        rows.push(rowObject);
      }

      return rows;
    }

    public async assertRowsNumberPerPage(rowsNumber: 10 | 25 | 50 | 100) {
      const textContent = await testSubjects.getVisibleText(
        `~${this.tableTestSubj} > tablePaginationPopoverButton`
      );
      expect(textContent).to.be(`Rows per page: ${rowsNumber}`);
    }

    public async waitForTableToStartLoading() {
      await testSubjects.existOrFail(`~${this.tableTestSubj}`, { timeout: 60 * 1000 });

      // After invoking an action that caused the table to start loading, the loading
      // should start quickly after the table exists. Sometimes it is even so quick that
      // the loading is already done when we try to check for it, so we're not failing
      // in that case and just move on.
      await testSubjects.exists(`${this.tableTestSubj} loading`, { timeout: 3 * 1000 });
    }

    public async waitForTableToLoad() {
      await testSubjects.existOrFail(`~${this.tableTestSubj}`, { timeout: 60 * 1000 });
      await testSubjects.existOrFail(`${this.tableTestSubj} loaded`, { timeout: 30 * 1000 });
    }

    async getSearchInput(): Promise<WebElementWrapper> {
      return await testSubjects.find(this.searchInputSubj);
    }

    public async assertSearchInputValue(expectedSearchValue: string) {
      const searchBarInput = await this.getSearchInput();
      const actualSearchValue = await searchBarInput.getAttribute('value');
      expect(actualSearchValue).to.eql(
        expectedSearchValue,
        `Search input value should be '${expectedSearchValue}' (got '${actualSearchValue}')`
      );
    }

    public async filterWithSearchString(queryString: string, expectedRowCount: number = 1) {
      await this.waitForTableToLoad();
      const searchBarInput = await this.getSearchInput();
      await searchBarInput.clearValueWithKeyboard();
      await searchBarInput.type(queryString);
      await commonPage.pressEnterKey();
      await this.assertSearchInputValue(queryString);
      await this.waitForTableToStartLoading();
      await this.waitForTableToLoad();

      const rows = await this.parseTable();

      expect(rows).to.have.length(
        expectedRowCount,
        `Filtered table should have ${expectedRowCount} row(s) for filter '${queryString}' (got ${rows.length} matching  items)`
      );
    }

    public async assertTableSorting(
      columnName: string,
      columnIndex: number,
      expectedDirection: 'desc' | 'asc'
    ) {
      const actualDirection = await this.getCurrentSorting();
      expect(actualDirection?.direction).to.eql(expectedDirection);
      expect(actualDirection?.columnName).to.eql(columnName);
    }

    public async getCurrentSorting(): Promise<
      { columnName: string; direction: string } | undefined
    > {
      const table = await testSubjects.find(`~${this.tableTestSubj}`);
      const headers = await table.findAllByClassName('euiTableHeaderCell');
      for (const header of headers) {
        const ariaSort = await header.getAttribute('aria-sort');
        if (ariaSort && ariaSort !== 'none') {
          const columnNameFragments = ((await header.getAttribute('data-test-subj')) ?? '').split(
            '_'
          );
          const columnName = columnNameFragments.slice(1, columnNameFragments.length - 1).join('_');
          return { columnName, direction: ariaSort.replace('ending', '') };
        }
      }
    }

    public async sortByField(columnName: string, columnIndex: number, direction: 'desc' | 'asc') {
      const testSubjString = `tableHeaderCell_${columnName}_${columnIndex}`;

      await retry.tryForTime(5000, async () => {
        await testSubjects.click(testSubjString);
        await this.waitForTableToStartLoading();
        await this.waitForTableToLoad();
        await this.assertTableSorting(columnName, columnIndex, direction);
      });
    }

    public async invokeAction(
      rowIndex: number,
      actionSubject: string,
      postActionCallback: () => Promise<void>
    ) {
      const rows = await testSubjects.findAll(
        `${this.parentSubj ? `${this.parentSubj} > ` : ''}~${this.tableTestSubj} > ~${
          this.tableRowSubj
        }`
      );

      const requestedRow = rows[rowIndex];
      const actionButton = await requestedRow.findByTestSubject(actionSubject);

      await retry.tryForTime(5000, async () => {
        await actionButton.click();
        if (postActionCallback) {
          await postActionCallback();
        }
        await this.waitForTableToLoad();
      });
    }

    public async selectAllRows() {
      await testSubjects.click(
        `${this.parentSubj ? `${this.parentSubj} > ` : ''} > checkboxSelectAll`
      );
    }
  };

  return {
    getServiceInstance(
      name: string,
      tableTestSubj: string,
      tableRowSubj: string,
      columns: Array<{ id: string; testSubj: string }>,
      searchInputSubj: string,
      parentSubj?: string
    ) {
      Object.defineProperty(TableService, 'name', { value: name });
      return new TableService(tableTestSubj, tableRowSubj, columns, searchInputSubj, parentSubj);
    },
  };
}
