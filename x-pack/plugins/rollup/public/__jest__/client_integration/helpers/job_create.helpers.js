/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { registerTestBed } from '@kbn/test/jest';
import { rollupJobsStore } from '../../../crud_app/store';
import { JobCreate } from '../../../crud_app/sections';

import { JOB_TO_CREATE } from './constants';

import { wrapComponent } from './setup_context';

const initTestBed = registerTestBed(wrapComponent(JobCreate), { store: rollupJobsStore });

export const setup = (props) => {
  const testBed = initTestBed(props);
  const { component, form, table } = testBed;

  // User actions
  const clickNextStep = () => {
    const button = testBed.find('rollupJobNextButton');
    button.simulate('click');
    component.update();
  };

  const clickPreviousStep = () => {
    const button = testBed.find('rollupJobBackButton');
    button.simulate('click');
    component.update();
  };

  const clickSave = () => {
    const button = testBed.find('rollupJobSaveButton');
    button.simulate('click');
    component.update();
  };

  // Forms
  const fillFormFields = async (step) => {
    switch (step) {
      case 'logistics':
        form.setInputValue('rollupJobName', JOB_TO_CREATE.id);
        await form.setInputValue('rollupIndexPattern', JOB_TO_CREATE.indexPattern, true);
        form.setInputValue('rollupIndexName', JOB_TO_CREATE.rollupIndex);
        break;
      case 'date-histogram':
        form.setInputValue('rollupJobInterval', JOB_TO_CREATE.interval);
        break;
      default:
        return;
    }
  };

  // Navigation
  const goToStep = async (targetStep) => {
    const stepHandlers = {
      1: () => fillFormFields('logistics'),
      2: () => fillFormFields('date-histogram'),
    };

    let currentStep = 1;
    while (currentStep < targetStep) {
      if (stepHandlers[currentStep]) {
        await stepHandlers[currentStep]();
      }
      clickNextStep();
      currentStep++;
    }
  };

  // Helpers for the metrics step in job creation.
  // Mostly placed here for now to make test file a bit smaller and specific
  // to tests.
  const getFieldListTableRows = () => {
    const { rows } = table.getMetaData('rollupJobMetricsFieldList');
    return rows;
  };

  const getFieldListTableRow = (row) => {
    const rows = getFieldListTableRows();
    return rows[row];
  };

  const getFieldChooserColumnForRow = (row) => {
    const selectedRow = getFieldListTableRow(row);
    const [, , fieldChooserColumn] = selectedRow.columns;
    return fieldChooserColumn;
  };

  const getSelectAllInputForRow = (row) => {
    const fieldChooser = getFieldChooserColumnForRow(row);
    return fieldChooser.reactWrapper.find('input').first();
  };

  // Misc
  const getEuiStepsHorizontalActive = () => component.find('.euiStepHorizontal-isSelected').text();

  return {
    ...testBed,
    goToStep,
    getEuiStepsHorizontalActive,
    actions: {
      clickNextStep,
      clickPreviousStep,
      clickSave,
    },
    form: {
      ...testBed.form,
      fillFormFields,
    },
    metrics: {
      getFieldListTableRows,
      getFieldListTableRow,
      getFieldChooserColumnForRow,
      getSelectAllInputForRow,
    },
  };
};
