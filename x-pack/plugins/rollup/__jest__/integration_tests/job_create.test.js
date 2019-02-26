/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import sinon from 'sinon';
import axios from 'axios';

import { registerTestBed } from '../utils';
import { rollupJobsStore } from '../../public/crud_app/store';
import { JobCreate } from '../../public/crud_app/sections';
import { setHttp } from '../../public/crud_app/services';

jest.mock('ui/index_patterns', () => {
  const { INDEX_PATTERN_ILLEGAL_CHARACTERS_VISIBLE } = require.requireActual('ui/index_patterns/constants');
  return {
    INDEX_PATTERN_ILLEGAL_CHARACTERS_VISIBLE,
  };
});

jest.mock('ui/chrome', () => ({
  addBasePath: () => '/api/rollup',
  breadcrumbs: {
    set: () => {},
  },
}));

jest.mock('lodash/function/debounce', () => fn => fn);

// axios has a $http like interface so using it to simulate $http
setHttp(axios.create());

const initUserActions = (component, findTestSubject) => {
  const clickNextStep = () => {
    const button = findTestSubject('rollupJobNextButton');
    button.simulate('click');
    component.update();
  };

  const clickPreviousStep = () => {
    const button = findTestSubject('rollupJobBackButton');
    button.simulate('click');
    component.update();
  };

  const clickSave = () => {
    const button = findTestSubject('rollupJobSaveButton');
    button.simulate('click');
    component.update();
  };

  return {
    clickNextStep,
    clickPreviousStep,
    clickSave,
  };
};

const initTestBed = () => {
  const testBed = registerTestBed(JobCreate, {}, rollupJobsStore)();

  return {
    ...testBed,
    userActions: {
      ...initUserActions(testBed.component, testBed.findTestSubject)
    }
  };
};

const mockServerResponses = server => {
  const mockIndexPatternValidity = (response) => {
    const defaultResponse = {
      doesMatchIndices: true,
      doesMatchRollupIndices: false,
      dateFields: ['foo.bar'],
      numericFields: [],
      keywordFields: [],
    };
    server.respondWith(/\/api\/rollup\/index_pattern_validity\/.*/, [
      200,
      { 'Content-Type': 'application/json' },
      JSON.stringify({ ...defaultResponse, ...response }),
    ]);
  };

  return { mockIndexPatternValidity };
};

describe('Create Rollup Job', () => {
  let server;
  let testSubjectExists;
  let userActions;
  let getFormErrorsMessages;
  let form;
  let mockIndexPatternValidity;

  beforeEach(() => {
    server = sinon.fakeServer.create();
    server.respondImmediately = true;
    ({ mockIndexPatternValidity } = mockServerResponses(server));

    ({
      testSubjectExists,
      userActions,
      getFormErrorsMessages,
      form
    } = initTestBed());

    // Mock API calls
    mockIndexPatternValidity();
  });

  afterEach(() => {
    server.restore();
  });

  describe('Step 1: Logistics', () => {
    it('should output errors when clicking "next" without filling the form', () => {
      expect(testSubjectExists('rollupJobCreateStepError')).toBeFalsy();

      userActions.clickNextStep();

      expect(testSubjectExists('rollupJobCreateStepError')).toBeTruthy();
      expect(getFormErrorsMessages()).toEqual([
        'Name is required.',
        'Index pattern is required.',
        'Rollup index is required.',
      ]);
    });

    describe('form validations', () => {
      describe('index pattern', () => {
        it('should not allow spaces', async () => {
          await form.setInputValue('rollupIndexPattern', 'with space', true);
          userActions.clickNextStep();
          expect(getFormErrorsMessages()).toContain('Remove the spaces from your index pattern.');
        });

        it('should not allow an unknown index pattern', async () => {
          mockIndexPatternValidity({ doesMatchIndices: false });
          await form.setInputValue('rollupIndexPattern', 'unknown', true);

          userActions.clickNextStep();

          expect(getFormErrorsMessages()).toContain('Index pattern doesn\'t match any indices.');
        });

        it('should not allow an index pattern without time fields', async () => {
          mockIndexPatternValidity({ dateFields: [] });
          await form.setInputValue('rollupIndexPattern', 'abc', true);

          userActions.clickNextStep();

          expect(getFormErrorsMessages()).toContain('Index pattern must match indices that contain time fields.');
        });

        it('should not allow an index pattern that matches a rollup index', async () => {
          mockIndexPatternValidity({ doesMatchRollupIndices: true });
          await form.setInputValue('rollupIndexPattern', 'abc', true);

          userActions.clickNextStep();

          expect(getFormErrorsMessages()).toContain('Index pattern must not match rollup indices.');
        });
      });
    });
  });
});
