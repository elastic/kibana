/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import sinon from 'sinon';

import { initTestBed, mockServerResponses } from './job_create.test_helpers';

jest.mock('ui/index_patterns', () => {
  const { INDEX_PATTERN_ILLEGAL_CHARACTERS_VISIBLE } = require.requireActual('../../../../../src/legacy/ui/public/index_patterns/constants'); // eslint-disable-line max-len
  return { INDEX_PATTERN_ILLEGAL_CHARACTERS_VISIBLE };
});

jest.mock('ui/chrome', () => ({
  addBasePath: () => '/api/rollup',
  breadcrumbs: { set: () => {} },
}));

jest.mock('lodash/function/debounce', () => fn => fn);

describe('Create Rollup Job, step 3: Terms', () => {
  let server;
  let findTestSubject;
  let testSubjectExists;
  let userActions;
  let mockIndexPatternValidityResponse;
  let getEuiStepsHorizontalActive;
  let goToStep;
  let getMetadataFromEuiTable;

  beforeEach(() => {
    server = sinon.fakeServer.create();
    server.respondImmediately = true;
    ({ mockIndexPatternValidityResponse } = mockServerResponses(server));
    ({
      findTestSubject,
      testSubjectExists,
      userActions,
      getEuiStepsHorizontalActive,
      goToStep,
      getMetadataFromEuiTable,
    } = initTestBed());
  });

  afterEach(() => {
    server.restore();
  });

  const numericFields = ['a-numericField', 'c-numericField'];
  const keywordFields =  ['b-keywordField', 'd-keywordField'];

  const goToStepAndOpenFieldChooser = async () => {
    await goToStep(3);
    findTestSubject('rollupJobShowFieldChooserButton').simulate('click');
  };

  describe('layout', () => {
    beforeEach(async () => {
      await goToStep(3);
    });

    it('should have the horizontal step active on "Terms"', () => {
      expect(getEuiStepsHorizontalActive()).toContain('Terms');
    });

    it('should have the title set to "Terms"', () => {
      expect(testSubjectExists('rollupJobCreateTermsTitle')).toBe(true);
    });

    it('should have a link to the documentation', () => {
      expect(testSubjectExists('rollupJobCreateTermsDocsButton')).toBe(true);
    });

    it('should have the "next" and "back" button visible', () => {
      expect(testSubjectExists('rollupJobBackButton')).toBe(true);
      expect(testSubjectExists('rollupJobNextButton')).toBe(true);
      expect(testSubjectExists('rollupJobSaveButton')).toBe(false);
    });

    it('should go to the "Date histogram" step when clicking the back button', async () => {
      userActions.clickPreviousStep();
      expect(getEuiStepsHorizontalActive()).toContain('Date histogram');
    });

    it('should go to the "Histogram" step when clicking the next button', async () => {
      userActions.clickNextStep();
      expect(getEuiStepsHorizontalActive()).toContain('Histogram');
    });

    it('should have a button to display the list of terms to chose from', () => {
      expect(testSubjectExists('rollupJobTermsFieldChooser')).toBe(false);

      findTestSubject('rollupJobShowFieldChooserButton').simulate('click');

      expect(testSubjectExists('rollupJobTermsFieldChooser')).toBe(true);
    });
  });

  describe('terms field chooser (flyout)', () => {
    describe('layout', () => {
      beforeEach(async () => {
        await goToStepAndOpenFieldChooser();
      });

      it('should have the title set to "Add terms fields"', async () => {
        expect(findTestSubject('rollupJobCreateFlyoutTitle').text()).toEqual('Add terms fields');
      });

      it('should have a button to close the flyout', () => {
        expect(testSubjectExists('rollupJobTermsFieldChooser')).toBe(true);

        findTestSubject('euiFlyoutCloseButton').simulate('click');

        expect(testSubjectExists('rollupJobTermsFieldChooser')).toBe(false);
      });
    });

    describe('when no terms are available', () => {
      it('should indicate it to the user', async () => {
        mockIndexPatternValidityResponse({ numericFields: [], keywordFields: [] });
        await goToStepAndOpenFieldChooser();

        const { tableCellsValues } = getMetadataFromEuiTable('rollupJobTermsFieldChooser-table');

        expect(tableCellsValues).toEqual([['No items found']]);
      });
    });

    describe('when terms are available', () => {
      beforeEach(async () => {
        mockIndexPatternValidityResponse({ numericFields, keywordFields });
        await goToStepAndOpenFieldChooser();
      });

      it('should display the numeric & keyword fields available', async () => {
        const { tableCellsValues } = getMetadataFromEuiTable('rollupJobTermsFieldChooser-table');

        expect(tableCellsValues).toEqual([
          ['a-numericField', 'numeric'],
          ['b-keywordField', 'keyword'],
          ['c-numericField', 'numeric'],
          ['d-keywordField', 'keyword'],
        ]);
      });

      it('should add term to the field list when clicking on it', () => {
        let { tableCellsValues } = getMetadataFromEuiTable('rollupJobTermsFieldList');
        expect(tableCellsValues).toEqual([['No terms fields added']]); // make sure the field list is empty

        const { rows } = getMetadataFromEuiTable('rollupJobTermsFieldChooser-table');
        rows[0].reactWrapper.simulate('click'); // Select first row

        ({ tableCellsValues } = getMetadataFromEuiTable('rollupJobTermsFieldList'));
        const [firstRow] = tableCellsValues;
        const [term, type] = firstRow;
        expect(term).toEqual('a-numericField');
        expect(type).toEqual('numeric');
      });
    });
  });

  describe('fields list', () => {
    it('should have an empty field list', async () => {
      await goToStep(3);

      const { tableCellsValues } = getMetadataFromEuiTable('rollupJobTermsFieldList');
      expect(tableCellsValues).toEqual([['No terms fields added']]);
    });

    it('should have a delete button on each row to remove a term', async () => {
      // First let's add a term to the list
      mockIndexPatternValidityResponse({ numericFields, keywordFields });
      await goToStepAndOpenFieldChooser();
      const { rows: fieldChooserRows } = getMetadataFromEuiTable('rollupJobTermsFieldChooser-table');
      fieldChooserRows[0].reactWrapper.simulate('click');

      // Make sure rows value has been set
      let { rows: fieldListRows } = getMetadataFromEuiTable('rollupJobTermsFieldList');
      expect(fieldListRows[0].columns[0].value).not.toEqual('No terms fields added');

      const columnsFirstRow = fieldListRows[0].columns;
      // The last column is the eui "actions" column
      const deleteButton = columnsFirstRow[columnsFirstRow.length - 1].reactWrapper.find('button');
      deleteButton.simulate('click');

      ({ rows: fieldListRows } = getMetadataFromEuiTable('rollupJobTermsFieldList'));
      expect(fieldListRows[0].columns[0].value).toEqual('No terms fields added');
    });
  });
});
