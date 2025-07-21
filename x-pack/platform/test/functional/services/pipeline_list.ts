/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { FtrProviderContext } from '../ftr_provider_context';

export function PipelineListProvider({ getService }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');
  const random = getService('random');

  // test subject selectors
  const SUBJ_CONTAINER = `pipelineList`;
  const SUBJ_BTN_ADD = `pipelineList > btnAdd`;
  const SUBJ_BTN_DELETE = `pipelineList > btnDeletePipeline`;
  const getCloneLinkSubjForId = (id: string): string => `pipelineList > lnkPipelineClone-${id}`;
  const SUBJ_FILTER = `pipelineList > filter`;
  const SUBJ_SELECT_ALL = `pipelineList > pipelineTable > checkboxSelectAll`;
  const getSelectCheckbox = (id: string): string =>
    `pipelineList > pipelineTable > checkboxSelectRow-${id}`;
  const SUBJ_BTN_NEXT_PAGE = `pipelineList > pagination-button-next`;

  const INNER_SUBJ_ROW = `row`;
  const INNER_SUBJ_CELL_ID = `cellId`;
  const INNER_SUBJ_CELL_DESCRIPTION = `cellDescription`;
  const INNER_SUBJ_CELL_LAST_MODIFIED = `cellLastModified`;
  const INNER_SUBJ_CELL_USERNAME = `cellUsername`;

  const SUBJ_CELL_ID = `${SUBJ_CONTAINER} > ${INNER_SUBJ_ROW} > ${INNER_SUBJ_CELL_ID}`;

  return new (class PipelineList {
    /**
     *  Set the text of the pipeline list filter
     *  @param  {string} value
     *  @return {Promise<undefined>}
     */
    async setFilter(value: string): Promise<void> {
      await testSubjects.setValue(SUBJ_FILTER, value);
    }

    /**
     *  Get the total row count as well as the count of rows that
     *  are selected/unselected
     *  @return {Promise<Object>}
     */
    async getRowCounts(): Promise<{ total: number; isSelected: number; isUnselected: number }> {
      const rows = await this.readRows();
      const total = rows.length;
      const isSelected = rows.reduce((acc: number, row: any) => acc + (row.selected ? 1 : 0), 0);
      const isUnselected = total - isSelected;
      return { total, isSelected, isUnselected };
    }

    /**
     *  Click the selectAll checkbox until all rows are selected
     *  @return {Promise<undefined>}
     */
    async selectAllRows(): Promise<void> {
      await retry.try(async () => {
        const { isUnselected } = await this.getRowCounts();
        if (isUnselected > 0) {
          await this.clickSelectAll();
          throw new Error(`${isUnselected} rows need to be selected`);
        }
      });
    }

    /**
     *  Click the selectAll checkbox until all rows are unselected
     *  @return {Promise<undefined>}
     */
    async deselectAllRows(): Promise<void> {
      await retry.try(async () => {
        const { isSelected } = await this.getRowCounts();
        if (isSelected > 0) {
          await this.clickSelectAll();
          throw new Error(`${isSelected} rows need to be deselected`);
        }
      });
    }

    /**
     *  Select a random row from the list and waits for the selection to
     *  be represented in the row counts
     *  @return {Promise<undefined>}
     */
    async selectRandomRow(): Promise<void> {
      const initial = await this.getRowCounts();

      if (!initial.total) {
        throw new Error('pipelineList.selectRandomRow() requires there to be at least one row');
      }

      if (!initial.isUnselected) {
        throw new Error('pipelineList.selectRandomRow() requires at least one unselected row');
      }

      // pick an unselected selectbox and select it
      const rows = await this.readRows();
      const rowToClick = await random.pickOne(rows.filter((r: any) => !r.selected));
      await testSubjects.click(getSelectCheckbox(rowToClick.id));

      await retry.waitFor(
        'selected count to grow',
        async () => (await this.getRowCounts()).isSelected > initial.isSelected
      );
    }

    /**
     *  Read the rows from the table, mapping the cell values to key names
     *  in an array of objects
     *  @return {Promise<Array<Object>>}
     */
    async readRows(): Promise<
      Array<{
        selected: boolean;
        id: string;
        description: string;
        lastModified: string;
        username: string;
      }>
    > {
      const pipelineTable = await testSubjects.find('pipelineTable');
      const $ = await pipelineTable.parseDomContent();
      return $.findTestSubjects(INNER_SUBJ_ROW)
        .toArray()
        .map((row: any) => {
          return {
            selected: $(row).hasClass('euiTableRow-isSelected'),
            id: $(row).findTestSubjects(INNER_SUBJ_CELL_ID).text(),
            description: $(row).findTestSubjects(INNER_SUBJ_CELL_DESCRIPTION).text(),
            lastModified: $(row).findTestSubjects(INNER_SUBJ_CELL_LAST_MODIFIED).text(),
            username: $(row).findTestSubjects(INNER_SUBJ_CELL_USERNAME).text(),
          };
        });
    }

    /**
     *  Click the add button, does not wait for navigation to complete
     *  @return {Promise<undefined>}
     */
    async clickAdd(): Promise<void> {
      await testSubjects.click(SUBJ_BTN_ADD);
    }

    /**
     *  Click the selectAll checkbox
     *  @return {Promise<undefined>}
     */
    async clickSelectAll(): Promise<void> {
      await testSubjects.click(SUBJ_SELECT_ALL);
    }

    /**
     *  Click the id of the first row
     *  @return {Promise<undefined>}
     */
    async clickFirstRowId(): Promise<void> {
      await testSubjects.click(SUBJ_CELL_ID);
    }

    /**
     *  Click the clone link for the given pipeline id
     *  @return {Promise<undefined>}
     */
    async clickCloneLink(id: string): Promise<void> {
      await testSubjects.click(getCloneLinkSubjForId(id));
    }

    /**
     *  Assert that the pipeline list is visible on screen
     *  @return {Promise<undefined>}
     */
    async assertExists(): Promise<void> {
      await retry.waitFor('pipline list visible on screen', async () => {
        const container = await testSubjects.find(SUBJ_CONTAINER);
        const found = await container.findAllByCssSelector('table tbody');
        const isLoading = await testSubjects.exists('loadingPipelines');
        return found.length > 0 && isLoading === false;
      });
    }

    /**
     *  Check if the delete button is enabled or disabled and
     *  throw the appropriate error if it is not
     *  @param  {boolean} expected
     *  @return {Promise}
     */
    async assertDeleteButton({ enabled }: { enabled: boolean }): Promise<void> {
      if (typeof enabled !== 'boolean') {
        throw new Error('you must specify the expected enabled state of the delete button');
      }

      const actual = await testSubjects.isEnabled(SUBJ_BTN_DELETE);
      if (enabled !== actual) {
        throw new Error(`Expected delete button to be ${enabled ? 'enabled' : 'disabled'}`);
      }
    }

    /**
     * Check if the delete button has been rendered on the page
     * and throw an error if it has
     */
    async assertDeleteButtonMissing(): Promise<void> {
      try {
        await testSubjects.missingOrFail(SUBJ_BTN_DELETE);
      } catch (e) {
        throw e;
      }
    }

    /**
     * Click the next page button
     */
    async clickNextPage(): Promise<void> {
      await testSubjects.click(SUBJ_BTN_NEXT_PAGE);
    }

    /**
     *  Check if the next page button is enabled or disabled and
     *  throw the appropriate error if it is not
     *  @param  {boolean} expected
     *  @return {Promise}
     */
    async assertNextPageButton({ enabled }: { enabled: boolean }): Promise<void> {
      if (typeof enabled !== 'boolean') {
        throw new Error('you must specify the expected enabled state of the next page button');
      }

      const actual = await testSubjects.isEnabled(SUBJ_BTN_NEXT_PAGE);
      if (enabled !== actual) {
        throw new Error(`Expected next page button to be ${enabled ? 'enabled' : 'disabled'}`);
      }
    }
  })();
}
