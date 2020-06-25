/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { pageHelpers, mockHttpRequest } from './helpers';
import { first } from 'lodash';
import { setHttp } from '../../crud_app/services';
import { JOBS } from './helpers/constants';
import { coreMock } from '../../../../../../src/core/public/mocks';

jest.mock('lodash', () => ({
  ...jest.requireActual('lodash'),
  debounce: (fn) => fn,
}));

jest.mock('../../kibana_services', () => {
  const services = require.requireActual('../../kibana_services');
  return {
    ...services,
    getUiStatsReporter: jest.fn(() => () => {}),
  };
});

const { setup } = pageHelpers.jobCreate;

describe('Create Rollup Job, step 6: Review', () => {
  let find;
  let exists;
  let actions;
  let getEuiStepsHorizontalActive;
  let goToStep;
  let table;
  let form;
  let startMock;

  beforeAll(() => {
    startMock = coreMock.createStart();
    setHttp(startMock.http);
  });

  beforeEach(() => {
    // Set "default" mock responses by not providing any arguments
    mockHttpRequest(startMock.http);
    ({ find, exists, actions, getEuiStepsHorizontalActive, goToStep, table, form } = setup());
  });

  afterEach(() => {
    startMock.http.get.mockClear();
    startMock.http.post.mockClear();
    startMock.http.put.mockClear();
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
      actions.clickPreviousStep();
      expect(getEuiStepsHorizontalActive()).toContain('Metrics');
    });
  });

  describe('tabs', () => {
    const getTabsText = () => find('stepReviewTab').map((tab) => tab.text());
    const selectFirstField = (step) => {
      find('rollupJobShowFieldChooserButton').simulate('click');

      // Select the first term field
      table
        .getMetaData(`rollupJob${step}FieldChooser-table`)
        .rows[0].reactWrapper.simulate('click');
    };

    it('should have a "Summary" & "Request" tabs to review the Job', async () => {
      await goToStep(6);
      expect(getTabsText()).toEqual(['Summary', 'Request']);
    });

    it('should have a "Summary", "Terms" & "Request" tab if a term aggregation was added', async () => {
      mockHttpRequest(startMock.http, { indxPatternVldtResp: { numericFields: ['my-field'] } });
      await goToStep(3);
      selectFirstField('Terms');

      actions.clickNextStep(); // go to step 4
      actions.clickNextStep(); // go to step 5
      actions.clickNextStep(); // go to review

      expect(getTabsText()).toEqual(['Summary', 'Terms', 'Request']);
    });

    it('should have a "Summary", "Histogram" & "Request" tab if a histogram field was added', async () => {
      mockHttpRequest(startMock.http, { indxPatternVldtResp: { numericFields: ['a-field'] } });
      await goToStep(4);
      selectFirstField('Histogram');
      form.setInputValue('rollupJobCreateHistogramInterval', 3); // set an interval

      actions.clickNextStep(); // go to step 5
      actions.clickNextStep(); // go to review

      expect(getTabsText()).toEqual(['Summary', 'Histogram', 'Request']);
    });

    it('should have a "Summary", "Metrics" & "Request" tab if a histogram field was added', async () => {
      mockHttpRequest(startMock.http, {
        indxPatternVldtResp: {
          numericFields: ['a-field'],
          dateFields: ['b-field'],
        },
      });
      await goToStep(5);
      selectFirstField('Metrics');
      form.selectCheckBox('rollupJobMetricsCheckbox-avg'); // select a metric

      actions.clickNextStep(); // go to review

      expect(getTabsText()).toEqual(['Summary', 'Metrics', 'Request']);
    });
  });

  describe('save()', () => {
    const jobCreateApiPath = '/api/rollup/create';
    const jobStartApiPath = '/api/rollup/start';

    describe('without starting job after creation', () => {
      it('should call the "create" Api server endpoint', async () => {
        mockHttpRequest(startMock.http, {
          createdJob: first(JOBS.jobs),
        });

        await goToStep(6);

        expect(startMock.http.put).not.toHaveBeenCalledWith(jobCreateApiPath); // make sure it hasn't been called
        expect(startMock.http.get).not.toHaveBeenCalledWith(jobStartApiPath); // make sure it hasn't been called

        actions.clickSave();
        // Given the following anti-jitter sleep x-pack/plugins/rollup/public/crud_app/store/actions/create_job.js
        // we add a longer sleep here :(
        await new Promise((res) => setTimeout(res, 750));

        expect(startMock.http.put).toHaveBeenCalledWith(jobCreateApiPath, expect.anything()); // It has been called!
        expect(startMock.http.get).not.toHaveBeenCalledWith(jobStartApiPath); // It has still not been called!
      });
    });

    describe('with starting job after creation', () => {
      it('should call the "create" and "start" Api server endpoints', async () => {
        mockHttpRequest(startMock.http, {
          createdJob: first(JOBS.jobs),
        });

        await goToStep(6);

        find('rollupJobToggleJobStartAfterCreation').simulate('change', {
          target: { checked: true },
        });

        expect(startMock.http.post).not.toHaveBeenCalledWith(jobStartApiPath); // make sure it hasn't been called

        actions.clickSave();
        // Given the following anti-jitter sleep x-pack/plugins/rollup/public/crud_app/store/actions/create_job.js
        // we add a longer sleep here :(
        await new Promise((res) => setTimeout(res, 750));

        expect(startMock.http.post).toHaveBeenCalledWith(jobStartApiPath, expect.anything()); // It has been called!
      });
    });
  });
});
