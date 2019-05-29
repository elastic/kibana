/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { setupEnvironment, pageHelpers } from './helpers';

jest.mock('ui/index_patterns', () => {
  const { INDEX_PATTERN_ILLEGAL_CHARACTERS_VISIBLE } = require.requireActual('../../../../../src/legacy/ui/public/index_patterns/constants'); // eslint-disable-line max-len
  return { INDEX_PATTERN_ILLEGAL_CHARACTERS_VISIBLE };
});

jest.mock('ui/chrome', () => ({
  addBasePath: () => '/api/rollup',
  breadcrumbs: { set: () => {} },
  getInjected: () => ({}),
}));

jest.mock('lodash/function/debounce', () => fn => fn);

const { setup } = pageHelpers.jobCreate;

describe('Create Rollup Job, step 5: Metrics', () => {
  let server;
  let httpRequestsMockHelpers;
  let find;
  let exists;
  let actions;
  let getEuiStepsHorizontalActive;
  let goToStep;
  let table;

  beforeAll(() => {
    ({ server, httpRequestsMockHelpers } = setupEnvironment());
  });

  afterAll(() => {
    server.restore();
  });

  beforeEach(() => {
    // Set "default" mock responses by not providing any arguments
    httpRequestsMockHelpers.setIndexPatternValidityResponse();

    ({
      find,
      exists,
      actions,
      getEuiStepsHorizontalActive,
      goToStep,
      table,
    } = setup());
  });

  const numericFields = ['a-numericField', 'c-numericField'];
  const dateFields = ['b-dateField', 'd-dateField'];

  const goToStepAndOpenFieldChooser = async () => {
    await goToStep(5);
    find('rollupJobShowFieldChooserButton').simulate('click');
  };

  describe('layout', () => {
    beforeEach(async () => {
      await goToStep(5);
    });

    it('should have the horizontal step active on "Metrics"', () => {
      expect(getEuiStepsHorizontalActive()).toContain('Metrics');
    });

    it('should have the title set to "Metrics"', () => {
      expect(exists('rollupJobCreateMetricsTitle')).toBe(true);
    });

    it('should have a link to the documentation', () => {
      expect(exists('rollupJobCreateMetricsDocsButton')).toBe(true);
    });

    it('should have the "next" and "back" button visible', () => {
      expect(exists('rollupJobBackButton')).toBe(true);
      expect(exists('rollupJobNextButton')).toBe(true);
      expect(exists('rollupJobSaveButton')).toBe(false);
    });

    it('should go to the "Histogram" step when clicking the back button', async () => {
      actions.clickPreviousStep();
      expect(getEuiStepsHorizontalActive()).toContain('Histogram');
    });

    it('should go to the "Review" step when clicking the next button', async () => {
      actions.clickNextStep();
      expect(getEuiStepsHorizontalActive()).toContain('Review');
    });

    it('should have a button to display the list of metrics fields to chose from', () => {
      expect(exists('rollupJobMetricsFieldChooser')).toBe(false);

      find('rollupJobShowFieldChooserButton').simulate('click');

      expect(exists('rollupJobMetricsFieldChooser')).toBe(true);
    });
  });

  describe('metrics field chooser (flyout)', () => {
    describe('layout', () => {
      beforeEach(async () => {
        await goToStepAndOpenFieldChooser();
      });

      it('should have the title set to "Add metrics fields"', async () => {
        expect(find('rollupJobCreateFlyoutTitle').text()).toEqual('Add metrics fields');
      });

      it('should have a button to close the flyout', () => {
        expect(exists('rollupJobMetricsFieldChooser')).toBe(true);

        find('euiFlyoutCloseButton').simulate('click');

        expect(exists('rollupJobMetricsFieldChooser')).toBe(false);
      });
    });

    describe('table', () => {
      beforeEach(async () => {
        httpRequestsMockHelpers.setIndexPatternValidityResponse({ numericFields, dateFields });
        await goToStepAndOpenFieldChooser();
      });

      it('should display the fields with metrics and its type', async () => {
        const { tableCellsValues } = table.getMetaData('rollupJobMetricsFieldChooser-table');

        expect(tableCellsValues).toEqual([
          ['a-numericField', 'numeric'],
          ['b-dateField', 'date'],
          ['c-numericField', 'numeric'],
          ['d-dateField', 'date'],
        ]);
      });

      it('should add metric field to the field list when clicking on a row', () => {
        let { tableCellsValues } = table.getMetaData('rollupJobMetricsFieldList');
        expect(tableCellsValues).toEqual([['No metrics fields added']]); // make sure the field list is empty

        const { rows } = table.getMetaData('rollupJobMetricsFieldChooser-table');
        rows[0].reactWrapper.simulate('click'); // Select first row in field chooser

        ({ tableCellsValues } = table.getMetaData('rollupJobMetricsFieldList'));
        const [firstRow] = tableCellsValues;
        const [field, type] = firstRow;
        expect(field).toEqual(rows[0].columns[0].value);
        expect(type).toEqual(rows[0].columns[1].value);
      });
    });
  });

  describe('fields list', () => {
    const addFieldToList = (type = 'numeric') => {
      if(!exists('rollupJobMetricsFieldChooser-table')) {
        find('rollupJobShowFieldChooserButton').simulate('click');
      }
      const { rows } = table.getMetaData('rollupJobMetricsFieldChooser-table');
      for (let i = 0; i < rows.length; i++) {
        if (rows[i].columns[1].value === type) {
          rows[i].reactWrapper.simulate('click');
          break;
        }
      }
    };

    it('should have an empty field list', async () => {
      await goToStep(5);

      const { tableCellsValues } = table.getMetaData('rollupJobMetricsFieldList');
      expect(tableCellsValues).toEqual([['No metrics fields added']]);
    });

    describe('when fields are added', () => {
      beforeEach(async () => {
        httpRequestsMockHelpers.setIndexPatternValidityResponse({ numericFields, dateFields });
        await goToStepAndOpenFieldChooser();
      });

      it('should have "avg", "max", "min", "sum" & "value count" metrics for *numeric* fields', () => {
        const numericTypeMetrics = ['avg', 'max', 'min', 'sum', 'value_count'];
        addFieldToList('numeric');
        numericTypeMetrics.forEach(type => {
          try {
            expect(exists(`rollupJobMetricsCheckbox-${type}`)).toBe(true);
          } catch(e) {
            throw(new Error(`Test subject "rollupJobMetricsCheckbox-${type}" was not found.`));
          }
        });

        // Make sure there are no other checkboxes
        const { rows: [firstRow] } = table.getMetaData('rollupJobMetricsFieldList');
        const columnWithMetricsCheckboxes = 2;
        const metricsCheckboxes = firstRow.columns[columnWithMetricsCheckboxes].reactWrapper.find('input');
        expect(metricsCheckboxes.length).toBe(numericTypeMetrics.length);
      });

      it('should have "max", "min", & "value count" metrics for *date* fields', () => {
        const dateTypeMetrics = ['max', 'min', 'value_count'];
        addFieldToList('date');

        dateTypeMetrics.forEach(type => {
          try {
            expect(exists(`rollupJobMetricsCheckbox-${type}`)).toBe(true);
          } catch(e) {
            throw(new Error(`Test subject "rollupJobMetricsCheckbox-${type}" was not found.`));
          }
        });

        // Make sure there are no other checkboxes
        const { rows: [firstRow] } = table.getMetaData('rollupJobMetricsFieldList');
        const columnWithMetricsCheckboxes = 2;
        const metricsCheckboxes = firstRow.columns[columnWithMetricsCheckboxes].reactWrapper.find('input');
        expect(metricsCheckboxes.length).toBe(dateTypeMetrics.length);
      });

      it('should not allow to go to the next step if at least one metric type is not selected', () => {
        expect(exists('rollupJobCreateStepError')).toBeFalsy();

        addFieldToList('numeric');
        actions.clickNextStep();

        const stepError = find('rollupJobCreateStepError');
        expect(stepError.length).toBeTruthy();
        expect(stepError.text()).toEqual('Select metrics types for these fields or remove them: a-numericField.');
        expect(find('rollupJobNextButton').props().disabled).toBe(true);
      });

      it('should have a delete button on each row to remove the metric field', async () => {
        const { rows: fieldChooserRows } = table.getMetaData('rollupJobMetricsFieldChooser-table');
        fieldChooserRows[0].reactWrapper.simulate('click'); // select first item

        // Make sure rows value has been set
        let { rows: fieldListRows } = table.getMetaData('rollupJobMetricsFieldList');
        expect(fieldListRows[0].columns[0].value).not.toEqual('No metrics fields added');

        const columnsFirstRow = fieldListRows[0].columns;
        // The last column is the eui "actions" column
        const deleteButton = columnsFirstRow[columnsFirstRow.length - 1].reactWrapper.find('button');
        deleteButton.simulate('click');

        ({ rows: fieldListRows } = table.getMetaData('rollupJobMetricsFieldList'));
        expect(fieldListRows[0].columns[0].value).toEqual('No metrics fields added');
      });
    });
  });
});
