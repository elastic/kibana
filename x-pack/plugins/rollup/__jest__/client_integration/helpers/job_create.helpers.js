/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { registerTestBed } from '../../../../../test_utils';
import { rollupJobsStore } from '../../../public/crud_app/store';
import { JobCreate } from '../../../public/crud_app/sections';

import { JOB_TO_CREATE } from './constants';

const initTestBed = registerTestBed(JobCreate, { store: rollupJobsStore });

export const setup = (props) => {
  const testBed = initTestBed(props);
  const { component, form } = testBed;

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
      2: () => fillFormFields('date-histogram')
    };

    let currentStep = 1;
    while(currentStep < targetStep) {
      if (stepHandlers[currentStep]) {
        await stepHandlers[currentStep]();
      }
      clickNextStep();
      currentStep++;
    }
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
      clickSave
    },
    form: {
      ...testBed.form,
      fillFormFields,
    },
  };
};
