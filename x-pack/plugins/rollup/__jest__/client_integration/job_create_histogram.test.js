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

describe('Create Rollup Job, step 4: Histogram', () => {
  let server;
  let findTestSubject;
  let testSubjectExists;
  let userActions;
  let mockIndexPatternValidityResponse;
  let getEuiStepsHorizontalActive;
  let goToStep;
  let getMetadataFromEuiTable;
  let form;
  let getFormErrorsMessages;

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
      form,
      getFormErrorsMessages,
    } = initTestBed());
  });

  afterEach(() => {
    server.restore();
  });

  const numericFields = ['a-numericField', 'b-numericField'];

  const goToStepAndOpenFieldChooser = async () => {
    await goToStep(4);
    findTestSubject('rollupJobShowFieldChooserButton').simulate('click');
  };

  describe('layout', () => {
    beforeEach(async () => {
      await goToStep(4);
    });

    it('should have the horizontal step active on "Histogram"', () => {
      expect(getEuiStepsHorizontalActive()).toContain('Histogram');
    });

    it('should have the title set to "Terms"', () => {
      expect(testSubjectExists('rollupJobCreateHistogramTitle')).toBe(true);
    });

    it('should have a link to the documentation', () => {
      expect(testSubjectExists('rollupJobCreateHistogramDocsButton')).toBe(true);
    });

    it('should have the "next" and "back" button visible', () => {
      expect(testSubjectExists('rollupJobBackButton')).toBe(true);
      expect(testSubjectExists('rollupJobNextButton')).toBe(true);
      expect(testSubjectExists('rollupJobSaveButton')).toBe(false);
    });

    it('should go to the "Terms" step when clicking the back button', async () => {
      userActions.clickPreviousStep();
      expect(getEuiStepsHorizontalActive()).toContain('Terms');
    });

    it('should go to the "Metrics" step when clicking the next button', async () => {
      userActions.clickNextStep();
      expect(getEuiStepsHorizontalActive()).toContain('Metrics');
    });

    it('should have a button to display the list of histogram fields to chose from', () => {
      expect(testSubjectExists('rollupJobHistogramFieldChooser')).toBe(false);

      findTestSubject('rollupJobShowFieldChooserButton').simulate('click');

      expect(testSubjectExists('rollupJobHistogramFieldChooser')).toBe(true);
    });
  });

  describe('histogram field chooser (flyout)', () => {
    describe('layout', () => {
      beforeEach(async () => {
        await goToStepAndOpenFieldChooser();
      });

      it('should have the title set to "Add histogram fields"', async () => {
        expect(findTestSubject('rollupJobCreateFlyoutTitle').text()).toEqual('Add histogram fields');
      });

      it('should have a button to close the flyout', () => {
        expect(testSubjectExists('rollupJobHistogramFieldChooser')).toBe(true);

        findTestSubject('euiFlyoutCloseButton').simulate('click');

        expect(testSubjectExists('rollupJobHistogramFieldChooser')).toBe(false);
      });
    });

    describe('when no histogram fields are availalbe', () => {
      it('should indicate it to the user', async () => {
        mockIndexPatternValidityResponse({ numericFields: [] });
        await goToStepAndOpenFieldChooser();

        const { tableCellsValues } = getMetadataFromEuiTable('rollupJobHistogramFieldChooser-table');

        expect(tableCellsValues).toEqual([['No items found']]);
      });
    });

    describe('when histogram fields are available', () => {
      beforeEach(async () => {
        mockIndexPatternValidityResponse({ numericFields });
        await goToStepAndOpenFieldChooser();
      });

      it('should display the histogram fields available', async () => {
        const { tableCellsValues } = getMetadataFromEuiTable('rollupJobHistogramFieldChooser-table');

        expect(tableCellsValues).toEqual([
          ['a-numericField'],
          ['b-numericField'],
        ]);
      });

      it('should add histogram field to the field list when clicking on it', () => {
        let { tableCellsValues } = getMetadataFromEuiTable('rollupJobHistogramFieldList');
        expect(tableCellsValues).toEqual([['No histogram fields added']]); // make sure the field list is empty

        const { rows } = getMetadataFromEuiTable('rollupJobHistogramFieldChooser-table');
        rows[0].reactWrapper.simulate('click'); // Select first row

        ({ tableCellsValues } = getMetadataFromEuiTable('rollupJobHistogramFieldList'));
        const [firstRow] = tableCellsValues;
        expect(firstRow[0]).toEqual('a-numericField');
      });
    });
  });

  describe('fields list', () => {
    it('should have an empty field list', async () => {
      await goToStep(4);

      const { tableCellsValues } = getMetadataFromEuiTable('rollupJobHistogramFieldList');
      expect(tableCellsValues).toEqual([['No histogram fields added']]);
    });

    it('should have a delete button on each row to remove an histogram field', async () => {
      // First let's add a term to the list
      mockIndexPatternValidityResponse({ numericFields });
      await goToStepAndOpenFieldChooser();
      const { rows: fieldChooserRows } = getMetadataFromEuiTable('rollupJobHistogramFieldChooser-table');
      fieldChooserRows[0].reactWrapper.simulate('click');

      // Make sure rows value has been set
      let { rows: fieldListRows } = getMetadataFromEuiTable('rollupJobHistogramFieldList');
      expect(fieldListRows[0].columns[0].value).not.toEqual('No histogram fields added');

      const columnsFirstRow = fieldListRows[0].columns;
      // The last column is the eui "actions" column
      const deleteButton = columnsFirstRow[columnsFirstRow.length - 1].reactWrapper.find('button');
      deleteButton.simulate('click');

      ({ rows: fieldListRows } = getMetadataFromEuiTable('rollupJobHistogramFieldList'));
      expect(fieldListRows[0].columns[0].value).toEqual('No histogram fields added');
    });
  });

  describe('interval', () => {
    const addHistogramFieldToList = () => {
      findTestSubject('rollupJobShowFieldChooserButton').simulate('click');
      const { rows } = getMetadataFromEuiTable('rollupJobHistogramFieldChooser-table');
      rows[0].reactWrapper.simulate('click');
    };

    beforeEach(async () => {
      mockIndexPatternValidityResponse({ numericFields });
      await goToStep(4);
      addHistogramFieldToList();
    });

    describe('input validation', () => {
      afterEach(() => {
        expect(findTestSubject('rollupJobNextButton').props().disabled).toBe(true);
      });

      it('should display errors when clicking "next" without filling the interval', () => {
        expect(testSubjectExists('rollupJobCreateStepError')).toBeFalsy();

        userActions.clickNextStep();

        expect(testSubjectExists('rollupJobCreateStepError')).toBeTruthy();
        expect(getFormErrorsMessages()).toEqual(['Interval must be a whole number.']);
      });

      it('should be a whole number', () => {
        form.setInputValue('rollupJobCreateHistogramInterval', 5.5);
        userActions.clickNextStep();
        expect(getFormErrorsMessages()).toEqual(['Interval must be a whole number.']);
      });

      it('should be greater than zero', () => {
        form.setInputValue('rollupJobCreateHistogramInterval', -1);
        userActions.clickNextStep();
        expect(getFormErrorsMessages()).toEqual(['Interval must be greater than zero.']);
      });
    });

    it('should go to next "Metrics" step if value is valid', () => {
      form.setInputValue('rollupJobCreateHistogramInterval', 3);
      userActions.clickNextStep();
      expect(getEuiStepsHorizontalActive()).toContain('Metrics');
    });
  });
});
