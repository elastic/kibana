/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import sinon from 'sinon';

import { initTestBed, mockServerResponses, nextTick } from './job_create.test_helpers';

jest.mock('ui/index_patterns', () => {
  const { INDEX_PATTERN_ILLEGAL_CHARACTERS_VISIBLE } = require.requireActual('../../../../../src/legacy/ui/public/index_patterns/constants'); // eslint-disable-line max-len
  return { INDEX_PATTERN_ILLEGAL_CHARACTERS_VISIBLE };
});

jest.mock('ui/chrome', () => ({
  addBasePath: (path) => path,
  breadcrumbs: { set: () => {} },
}));

jest.mock('lodash/function/debounce', () => fn => fn);


describe('Create Rollup Job, step 5: Metrics', () => {
  let server;
  let find;
  let exists;
  let userActions;
  let mockIndexPatternValidityResponse;
  let getEuiStepsHorizontalActive;
  let goToStep;
  let getMetadataFromEuiTable;
  let form;

  beforeEach(() => {
    server = sinon.fakeServer.create();
    server.respondImmediately = true;
    ({ mockIndexPatternValidityResponse } = mockServerResponses(server));
    ({
      find,
      exists,
      userActions,
      getEuiStepsHorizontalActive,
      goToStep,
      getMetadataFromEuiTable,
      form
    } = initTestBed());
  });

  afterEach(() => {
    server.restore();
  });

  describe('layout', () => {
    beforeEach(async () => {
      await goToStep(6);
    });

    it('should have the horizontal step active on "Review"', () => {
      expect(getEuiStepsHorizontalActive()).toContain('Review');
    });

    it('should have the title set to "Review"', () => {
      expect(exists('rollupJobCreateReviewTitle')).toBe(true);
    });

    it('should have the "next" and "save" button visible', () => {
      expect(exists('rollupJobBackButton')).toBe(true);
      expect(exists('rollupJobNextButton')).toBe(false);
      expect(exists('rollupJobSaveButton')).toBe(true);
    });

    it('should go to the "Metrics" step when clicking the back button', async () => {
      userActions.clickPreviousStep();
      expect(getEuiStepsHorizontalActive()).toContain('Metrics');
    });
  });

  describe('tabs', () => {
    const getTabsText = () => find('stepReviewTab').map(tab => tab.text());
    const selectFirstField = (step) => {
      find('rollupJobShowFieldChooserButton').simulate('click');

      // Select the first term field
      getMetadataFromEuiTable(`rollupJob${step}FieldChooser-table`)
        .rows[0]
        .reactWrapper
        .simulate('click');
    };

    it('should have a "Summary" & "JSON" tabs to review the Job', async () => {
      await goToStep(6);
      expect(getTabsText()).toEqual(['Summary', 'JSON']);
    });

    it('should have a "Summary", "Terms" & "JSON" tab if a term aggregation was added', async () => {
      mockIndexPatternValidityResponse({ numericFields: ['my-field'] });
      await goToStep(3);
      selectFirstField('Terms');

      userActions.clickNextStep(); // go to step 4
      userActions.clickNextStep(); // go to step 5
      userActions.clickNextStep(); // go to review

      expect(getTabsText()).toEqual(['Summary', 'Terms', 'JSON']);
    });

    it('should have a "Summary", "Histogram" & "JSON" tab if a histogram field was added', async () => {
      mockIndexPatternValidityResponse({ numericFields: ['a-field'] });
      await goToStep(4);
      selectFirstField('Histogram');
      form.setInputValue('rollupJobCreateHistogramInterval', 3); // set an interval

      userActions.clickNextStep(); // go to step 5
      userActions.clickNextStep(); // go to review

      expect(getTabsText()).toEqual(['Summary', 'Histogram', 'JSON']);
    });

    it('should have a "Summary", "Metrics" & "JSON" tab if a histogram field was added', async () => {
      mockIndexPatternValidityResponse({ numericFields: ['a-field'], dateFields: ['b-field'] });
      await goToStep(5);
      selectFirstField('Metrics');
      form.selectCheckBox('rollupJobMetricsCheckbox-avg'); // select a metric

      userActions.clickNextStep(); // go to review

      expect(getTabsText()).toEqual(['Summary', 'Metrics', 'JSON']);
    });
  });

  describe('save()', () => {
    it('should call the "create" Api server endpoint', async () => {
      await goToStep(6);

      const jobCreateApiPath = '/api/rollup/create';
      expect(server.requests.find(r => r.url === jobCreateApiPath)).toBe(undefined); // make sure it hasn't been called

      userActions.clickSave();
      await nextTick();

      expect(server.requests.find(r => r.url === jobCreateApiPath)).not.toBe(undefined); // It has been called!
    });
  });
});
