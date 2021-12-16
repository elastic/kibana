/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockHttpRequest, pageHelpers } from './helpers';

import { act } from 'react-dom/test-utils';
import { setHttp, init as initDocumentation } from '../../crud_app/services';
import { JOB_TO_CLONE, JOB_CLONE_INDEX_PATTERN_CHECK } from './helpers/constants';
import { coreMock, docLinksServiceMock } from '../../../../../../src/core/public/mocks';

const { setup } = pageHelpers.jobClone;
const {
  jobs: [{ config: jobConfig }],
} = JOB_TO_CLONE;

describe('Cloning a rollup job through create job wizard', () => {
  let find;
  let exists;
  let form;
  let table;
  let actions;
  let startMock;

  beforeAll(() => {
    jest.useFakeTimers();
    startMock = coreMock.createStart();
    setHttp(startMock.http);
    initDocumentation(docLinksServiceMock.createStartContract());
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    mockHttpRequest(startMock.http, { indxPatternVldtResp: JOB_CLONE_INDEX_PATTERN_CHECK });

    ({ exists, find, form, actions, table } = setup());
  });

  afterEach(() => {
    startMock.http.get.mockClear();
    startMock.http.post.mockClear();
    startMock.http.put.mockClear();
  });

  it('should have fields correctly pre-populated', async () => {
    // Step 1: Logistics

    expect(find('rollupJobName').props().value).toBe(jobConfig.id + '-copy');
    expect(form.getErrorsMessages()).toEqual([]);
    // Advanced cron should automatically show when we are cloning a job
    expect(exists('rollupAdvancedCron')).toBe(true);

    expect(find('rollupAdvancedCron').props().value).toBe(jobConfig.cron);
    expect(find('rollupPageSize').props().value).toBe(jobConfig.page_size);
    const {
      groups: { date_histogram: dateHistogram },
    } = jobConfig;
    expect(find('rollupDelay').props().value).toBe(dateHistogram.delay);

    form.setInputValue('rollupJobName', 't3');
    form.setInputValue('rollupIndexName', 't3');

    await actions.clickNextStep();

    // Step 2: Date histogram

    expect(find('rollupJobCreateDateFieldSelect').props().value).toBe(dateHistogram.field);
    expect(find('rollupJobInterval').props().value).toBe(dateHistogram.calendar_interval);
    expect(find('rollupJobCreateTimeZoneSelect').props().value).toBe(dateHistogram.time_zone);

    await actions.clickNextStep();

    // Step 3: Terms

    const { tableCellsValues: tableCellValuesTerms } = table.getMetaData('rollupJobTermsFieldList');
    const {
      groups: {
        terms: { fields: terms },
      },
    } = jobConfig;

    expect(tableCellValuesTerms.length).toBe(terms.length);
    for (const [keyword] of tableCellValuesTerms) {
      expect(terms.find((term) => term === keyword)).toBe(keyword);
    }

    await actions.clickNextStep();

    // Step 4: Histogram

    const { tableCellsValues: tableCellValuesHisto } = table.getMetaData(
      'rollupJobHistogramFieldList'
    );

    const {
      groups: {
        histogram: { fields: histogramsTerms },
      },
    } = jobConfig;

    expect(tableCellValuesHisto.length).toBe(histogramsTerms.length);
    for (const [keyword] of tableCellValuesHisto) {
      expect(histogramsTerms.find((term) => term === keyword)).toBe(keyword);
    }

    await actions.clickNextStep();

    // Step 5: Metrics

    const { metrics } = jobConfig;
    const { rows: metricsRows } = table.getMetaData('rollupJobMetricsFieldList');

    // Slight nastiness due to nested arrays:
    // For each row in the metrics table we want to assert that the checkboxes
    // are either checked, or not checked, according to the job config we are cloning
    metricsRows.forEach((metricRow, idx) => {
      // Assumption: metrics from the jobConfig and metrics displayed on the UI
      // are parallel arrays; so we can use row index to get the corresponding config.
      const { metrics: checkedMetrics } = metrics[idx];
      const {
        columns: [, , { reactWrapper: checkboxColumn }],
      } = metricRow;

      let checkedCountActual = 0;
      const checkedCountExpected = checkedMetrics.length;

      checkboxColumn.find('input').forEach((el) => {
        const props = el.props();
        const shouldBeChecked = checkedMetrics.some(
          (checkedMetric) => props['data-test-subj'] === `rollupJobMetricsCheckbox-${checkedMetric}`
        );
        if (shouldBeChecked) ++checkedCountActual;
        expect(props.checked).toBe(shouldBeChecked);
      });
      // All inputs from job config have been accounted for on the UI
      expect(checkedCountActual).toBe(checkedCountExpected);
    });
  });

  it('should correctly reset defaults after index pattern changes', async () => {
    // 1. Logistics

    // Sanity check for rollup job name, i.e., we are in clone mode.
    expect(find('rollupJobName').props().value).toBe(jobConfig.id + '-copy');

    // Changing the index pattern value after cloning a rollup job should update a number of values.
    // On each view of the set up wizard we check for the expected state after this change.

    await act(async () => {
      form.setInputValue('rollupIndexPattern', 'test');
    });

    const {
      groups: { date_histogram: dateHistogram },
    } = jobConfig;

    await actions.clickNextStep();

    // 2. Date Histogram

    expect(exists('rollupJobCreateDateHistogramTitle')).toBe(true);
    expect(find('rollupJobCreateDateFieldSelect').props().value).toBe(dateHistogram.field);

    await actions.clickNextStep();

    // 3. Terms

    expect(exists('rollupJobCreateTermsTitle')).toBe(true);
    const { tableCellsValues: tableCellValuesTerms } = table.getMetaData('rollupJobTermsFieldList');
    expect(tableCellValuesTerms[0][0]).toBe('No terms fields added');

    await actions.clickNextStep();

    // 4. Histogram

    expect(exists('rollupJobCreateHistogramTitle')).toBe(true);
    const { tableCellsValues: tableCellValuesHisto } = table.getMetaData(
      'rollupJobHistogramFieldList'
    );

    expect(tableCellValuesHisto[0][0]).toBe('No histogram fields added');

    await actions.clickNextStep();

    // 5. Metrics

    expect(exists('rollupJobCreateMetricsTitle')).toBe(true);
    const { rows: metricsRows } = table.getMetaData('rollupJobMetricsFieldList');
    // Empty placeholder value
    expect(metricsRows.length).toBe(1);

    // 6. Review

    await actions.clickNextStep();

    expect(exists('rollupJobCreateReviewTitle')).toBe(true);
  });
});
