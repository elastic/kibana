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

describe('Create Rollup Job, step 5: Metrics', () => {
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
  const dateFields = ['b-dateField', 'd-dateField'];

  const goToStepAndOpenFieldChooser = async () => {
    await goToStep(5);
    findTestSubject('rollupJobShowFieldChooserButton').simulate('click');
  };

  describe('layout', () => {
    beforeEach(async () => {
      await goToStep(5);
    });

    it('should have the horizontal step active on "Metrics"', () => {
      expect(getEuiStepsHorizontalActive()).toContain('Metrics');
    });

    it('should have the title set to "Metrics"', () => {
      expect(testSubjectExists('rollupJobCreateMetricsTitle')).toBe(true);
    });

    it('should have a link to the documentation', () => {
      expect(testSubjectExists('rollupJobCreateMetricsDocsButton')).toBe(true);
    });

    it('should have the "next" and "back" button visible', () => {
      expect(testSubjectExists('rollupJobBackButton')).toBe(true);
      expect(testSubjectExists('rollupJobNextButton')).toBe(true);
      expect(testSubjectExists('rollupJobSaveButton')).toBe(false);
    });

    it('should go to the "Histogram" step when clicking the back button', async () => {
      userActions.clickPreviousStep();
      expect(getEuiStepsHorizontalActive()).toContain('Histogram');
    });

    it('should go to the "Review" step when clicking the next button', async () => {
      userActions.clickNextStep();
      expect(getEuiStepsHorizontalActive()).toContain('Review');
    });

    it('should have a button to display the list of metrics fields to chose from', () => {
      expect(testSubjectExists('rollupJobMetricsFieldChooser')).toBe(false);

      findTestSubject('rollupJobShowFieldChooserButton').simulate('click');

      expect(testSubjectExists('rollupJobMetricsFieldChooser')).toBe(true);
    });
  });

  describe('metrics field chooser (flyout)', () => {
    describe('layout', () => {
      beforeEach(async () => {
        await goToStepAndOpenFieldChooser();
      });

      it('should have the title set to "Add metrics fields"', async () => {
        expect(findTestSubject('rollupJobCreateFlyoutTitle').text()).toEqual('Add metrics fields');
      });

      it('should have a button to close the flyout', () => {
        expect(testSubjectExists('rollupJobMetricsFieldChooser')).toBe(true);

        findTestSubject('euiFlyoutCloseButton').simulate('click');

        expect(testSubjectExists('rollupJobMetricsFieldChooser')).toBe(false);
      });
    });

    describe('table', () => {
      beforeEach(async () => {
        mockIndexPatternValidityResponse({ numericFields, dateFields });
        await goToStepAndOpenFieldChooser();
      });

      it('should display the fields with metrics and its type', async () => {
        const { tableCellsValues } = getMetadataFromEuiTable('rollupJobMetricsFieldChooser-table');

        expect(tableCellsValues).toEqual([
          ['a-numericField', 'numeric'],
          ['b-dateField', 'date'],
          ['c-numericField', 'numeric'],
          ['d-dateField', 'date'],
        ]);
      });

      it('should add metric field to the field list when clicking on a row', () => {
        let { tableCellsValues } = getMetadataFromEuiTable('rollupJobMetricsFieldList');
        expect(tableCellsValues).toEqual([['No metrics fields added']]); // make sure the field list is empty

        const { rows } = getMetadataFromEuiTable('rollupJobMetricsFieldChooser-table');
        rows[0].reactWrapper.simulate('click'); // Select first row in field chooser

        ({ tableCellsValues } = getMetadataFromEuiTable('rollupJobMetricsFieldList'));
        const [firstRow] = tableCellsValues;
        const [field, type] = firstRow;
        expect(field).toEqual(rows[0].columns[0].value);
        expect(type).toEqual(rows[0].columns[1].value);
      });
    });
  });

  describe('fields list', () => {
    const addFieldToList = (type = 'numeric') => {
      if(!testSubjectExists('rollupJobMetricsFieldChooser-table')) {
        findTestSubject('rollupJobShowFieldChooserButton').simulate('click');
      }
      const { rows } = getMetadataFromEuiTable('rollupJobMetricsFieldChooser-table');
      for (let i = 0; i < rows.length; i++) {
        if (rows[i].columns[1].value === type) {
          rows[i].reactWrapper.simulate('click');
          break;
        }
      }
    };

    it('should have an empty field list', async () => {
      await goToStep(5);

      const { tableCellsValues } = getMetadataFromEuiTable('rollupJobMetricsFieldList');
      expect(tableCellsValues).toEqual([['No metrics fields added']]);
    });

    describe('when fields are added', () => {
      beforeEach(async () => {
        mockIndexPatternValidityResponse({ numericFields, dateFields });
        await goToStepAndOpenFieldChooser();
      });

      it('should have "avg", "max", "min", "sum" & "value count" metrics for *numeric* fields', () => {
        const numericTypeMetrics = ['avg', 'max', 'min', 'sum', 'value_count'];
        addFieldToList('numeric');
        numericTypeMetrics.forEach(type => {
          try {
            expect(testSubjectExists(`rollupJobMetricsCheckbox-${type}`)).toBe(true);
          } catch(e) {
            throw(new Error(`Test subject "rollupJobMetricsCheckbox-${type}" was not found.`));
          }
        });

        // Make sure there are no other checkboxes
        const { rows: [firstRow] } = getMetadataFromEuiTable('rollupJobMetricsFieldList');
        const columnWithMetricsCheckboxes = 2;
        const metricsCheckboxes = firstRow.columns[columnWithMetricsCheckboxes].reactWrapper.find('input');
        expect(metricsCheckboxes.length).toBe(numericTypeMetrics.length);
      });

      it('should have "max", "min", & "value count" metrics for *date* fields', () => {
        const dateTypeMetrics = ['max', 'min', 'value_count'];
        addFieldToList('date');

        dateTypeMetrics.forEach(type => {
          try {
            expect(testSubjectExists(`rollupJobMetricsCheckbox-${type}`)).toBe(true);
          } catch(e) {
            throw(new Error(`Test subject "rollupJobMetricsCheckbox-${type}" was not found.`));
          }
        });

        // Make sure there are no other checkboxes
        const { rows: [firstRow] } = getMetadataFromEuiTable('rollupJobMetricsFieldList');
        const columnWithMetricsCheckboxes = 2;
        const metricsCheckboxes = firstRow.columns[columnWithMetricsCheckboxes].reactWrapper.find('input');
        expect(metricsCheckboxes.length).toBe(dateTypeMetrics.length);
      });

      it('should not allow to go to the next step if at least one metric type is not selected', () => {
        expect(testSubjectExists('rollupJobCreateStepError')).toBeFalsy();

        addFieldToList('numeric');
        userActions.clickNextStep();

        const stepError = findTestSubject('rollupJobCreateStepError');
        expect(stepError.length).toBeTruthy();
        expect(stepError.text()).toEqual('Select metrics types for these fields or remove them: a-numericField.');
        expect(findTestSubject('rollupJobNextButton').props().disabled).toBe(true);
      });

      it('should have a delete button on each row to remove the metric field', async () => {
        const { rows: fieldChooserRows } = getMetadataFromEuiTable('rollupJobMetricsFieldChooser-table');
        fieldChooserRows[0].reactWrapper.simulate('click'); // select first item

        // Make sure rows value has been set
        let { rows: fieldListRows } = getMetadataFromEuiTable('rollupJobMetricsFieldList');
        expect(fieldListRows[0].columns[0].value).not.toEqual('No metrics fields added');

        const columnsFirstRow = fieldListRows[0].columns;
        // The last column is the eui "actions" column
        const deleteButton = columnsFirstRow[columnsFirstRow.length - 1].reactWrapper.find('button');
        deleteButton.simulate('click');

        ({ rows: fieldListRows } = getMetadataFromEuiTable('rollupJobMetricsFieldList'));
        expect(fieldListRows[0].columns[0].value).toEqual('No metrics fields added');
      });
    });
  });
});
