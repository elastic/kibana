/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import axios from 'axios';

import { registerTestBed } from '../../../../test_utils';
import { rollupJobsStore } from '../../public/crud_app/store';
import {
  setHttp,
} from '../../public/crud_app/services';

import { JobCreate } from '../../public/crud_app/sections';

// axios has a $http like interface so using it to simulate $http
setHttp(axios.create());

// This is the Rollup job we will be creating in our tests
const JOB_TO_CREATE = {
  id: 'test-job',
  indexPattern: 'test-pattern-*',
  rollupIndex: 'rollup-index',
  interval: '24h'
};

const initUserActions = (component, find) => {
  const clickNextStep = () => {
    const button = find('rollupJobNextButton');
    button.simulate('click');
    component.update();
  };

  const clickPreviousStep = () => {
    const button = find('rollupJobBackButton');
    button.simulate('click');
    component.update();
  };

  const clickSave = () => {
    const button = find('rollupJobSaveButton');
    button.simulate('click');
    component.update();
  };

  return {
    clickNextStep,
    clickPreviousStep,
    clickSave,
  };
};

const initFillFormFields = form => async (step) => {
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

const initGoToStep = (fillFormFields, clickNextStep) => async (targetStep) => {
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

export const initTestBed = () => {
  const testBed = registerTestBed(JobCreate, {}, rollupJobsStore)();
  const userActions = initUserActions(testBed.component, testBed.find);
  const fillFormFields = initFillFormFields(testBed.form);
  const goToStep = initGoToStep(fillFormFields, userActions.clickNextStep);
  const getEuiStepsHorizontalActive = () => testBed.component.find('.euiStepHorizontal-isSelected').text();

  return {
    ...testBed,
    userActions: {
      ...userActions
    },
    form: {
      ...testBed.form,
      fillFormFields,
    },
    goToStep,
    getEuiStepsHorizontalActive,
  };
};

export { nextTick } from '../../../../test_utils';

export const mockServerResponses = server => {
  const mockIndexPatternValidityResponse = (response) => {
    const defaultResponse = {
      doesMatchIndices: true,
      doesMatchRollupIndices: false,
      dateFields: ['foo', 'bar'],
      numericFields: [],
      keywordFields: [],
    };
    server.respondWith(/\/api\/rollup\/index_pattern_validity\/.*/, [
      200,
      { 'Content-Type': 'application/json' },
      JSON.stringify({ ...defaultResponse, ...response }),
    ]);
  };

  const mockCreateJob = () => {
    server.respondWith(/\/api\/rollup\/create/, [
      200,
      { 'Content-Type': 'application/json' },
      JSON.stringify({}),
    ]);
  };

  const mockUserActions = () => {
    server.respondWith(/\/api\/user_action\/.*/, [
      200,
      { 'Content-Type': 'application/json' },
      JSON.stringify({}),
    ]);
  };

  mockIndexPatternValidityResponse();
  mockCreateJob();
  mockUserActions();

  return { mockIndexPatternValidityResponse };
};

