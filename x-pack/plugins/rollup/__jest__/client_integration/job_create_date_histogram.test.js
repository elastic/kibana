/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import sinon from 'sinon';
import moment from 'moment-timezone';

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

describe('Create Rollup Job, step 2: Date histogram', () => {
  let server;
  let findTestSubject;
  let testSubjectExists;
  let userActions;
  let getFormErrorsMessages;
  let form;
  let mockIndexPatternValidityResponse;
  let getEuiStepsHorizontalActive;
  let goToStep;

  beforeEach(() => {
    server = sinon.fakeServer.create();
    server.respondImmediately = true;
    ({ mockIndexPatternValidityResponse } = mockServerResponses(server));
    ({
      findTestSubject,
      testSubjectExists,
      userActions,
      getFormErrorsMessages,
      form,
      getEuiStepsHorizontalActive,
      goToStep,
    } = initTestBed());
  });

  afterEach(() => {
    server.restore();
  });

  describe('layout', () => {
    beforeEach(async () => {
      await goToStep(2);
    });

    it('should have the horizontal step active on "Date histogram"', () => {
      expect(getEuiStepsHorizontalActive()).toContain('Date histogram');
    });

    it('should have the title set to "Date histogram"', () => {
      expect(testSubjectExists('rollupJobCreateDateHistogramTitle')).toBe(true);
    });

    it('should have a link to the documentation', () => {
      expect(testSubjectExists('rollupJobCreateDateHistogramDocsButton')).toBe(true);
    });

    it('should have the "next" and "back" button visible', () => {
      expect(testSubjectExists('rollupJobBackButton')).toBe(true);
      expect(testSubjectExists('rollupJobNextButton')).toBe(true);
      expect(testSubjectExists('rollupJobSaveButton')).toBe(false);
    });

    it('should go to the "Logistics" step when clicking the back button', async () => {
      userActions.clickPreviousStep();
      expect(getEuiStepsHorizontalActive()).toContain('Logistics');
    });
  });

  describe('Date field select', () => {
    it('should set the options value from the index pattern', async () => {
      const dateFields = ['field1', 'field2', 'field3'];
      mockIndexPatternValidityResponse({ dateFields });

      await goToStep(2);

      const dateFieldSelectOptionsValues = findTestSubject('rollupJobCreateDateFieldSelect').find('option').map(option => option.text());
      expect(dateFieldSelectOptionsValues).toEqual(dateFields);
    });
  });

  describe('time zone', () => {
    it('should have a select with all the timezones', async () => {
      await goToStep(2);

      const timeZoneSelect = findTestSubject('rollupJobCreateTimeZoneSelect');
      const options = timeZoneSelect.find('option').map(option => option.text());
      expect(options).toEqual(moment.tz.names());
    });
  });

  describe('form validation', () => {
    beforeEach(async () => {
      await goToStep(2);
    });

    it('should display errors when clicking "next" without filling the form', () => {
      expect(testSubjectExists('rollupJobCreateStepError')).toBeFalsy();

      userActions.clickNextStep();

      expect(testSubjectExists('rollupJobCreateStepError')).toBeTruthy();
      expect(getFormErrorsMessages()).toEqual(['Interval is required.']);
      expect(findTestSubject('rollupJobNextButton').props().disabled).toBe(true);
    });

    describe('interval', () => {
      afterEach(() => {
        expect(findTestSubject('rollupJobNextButton').props().disabled).toBe(true);
      });

      it('should validate the interval format', () => {
        form.setInputValue('rollupJobInterval', 'abc');
        userActions.clickNextStep();
        expect(getFormErrorsMessages()).toContain('Invalid interval format.');
      });

      it('should validate the calendar format', () => {
        form.setInputValue('rollupJobInterval', '3y');
        userActions.clickNextStep();
        expect(getFormErrorsMessages()).toContain(`The 'y' unit only allows values of 1. Try 1y.`);
      });
    });
  });
});
