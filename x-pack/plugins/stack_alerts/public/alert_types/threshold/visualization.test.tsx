/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act } from 'react-dom/test-utils';
import { mountWithIntl, nextTick } from '@kbn/test-jest-helpers';
import { ThresholdVisualization } from './visualization';
import { DataPublicPluginStart } from '@kbn/data-plugin/public/types';
import { chartPluginMock } from '@kbn/charts-plugin/public/mocks';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { uiSettingsServiceMock } from '@kbn/core/public/mocks';
import {
  builtInAggregationTypes,
  builtInComparators,
} from '@kbn/triggers-actions-ui-plugin/public';
import { Chart, LineAnnotation, LineSeries } from '@elastic/charts';
import { useKibana } from '@kbn/kibana-react-plugin/public';

jest.mock('@kbn/kibana-react-plugin/public');
jest.mock('./index_threshold_api', () => ({
  getThresholdAlertVisualizationData: jest.fn(() =>
    Promise.resolve({
      results: [
        { group: 'a', metrics: [['b', 2]] },
        { group: 'a', metrics: [['b', 10]] },
      ],
    })
  ),
}));

const { getThresholdAlertVisualizationData } = jest.requireMock('./index_threshold_api');

const dataMock = dataPluginMock.createStartContract();
const chartsStartMock = chartPluginMock.createStartContract();
dataMock.fieldFormats = {
  getDefaultInstance: jest.fn(() => ({
    convert: jest.fn((s: unknown) => JSON.stringify(s)),
  })),
} as unknown as DataPublicPluginStart['fieldFormats'];

describe('ThresholdVisualization', () => {
  beforeAll(() => {
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        uiSettings: uiSettingsServiceMock.createSetupContract(),
      },
    });
  });

  const ruleParams = {
    index: 'test-index',
    aggType: 'count',
    thresholdComparator: '>',
    threshold: [0],
    timeWindowSize: 15,
    timeWindowUnit: 's',
  };

  async function setup() {
    const wrapper = mountWithIntl(
      <ThresholdVisualization
        ruleParams={ruleParams}
        alertInterval="1m"
        aggregationTypes={builtInAggregationTypes}
        comparators={builtInComparators}
        charts={chartsStartMock}
        dataFieldsFormats={dataMock.fieldFormats}
      />
    );

    await act(async () => {
      await nextTick();
      wrapper.update();
    });
    return wrapper;
  }

  test('periodically requests visualization data', async () => {
    const refreshRate = 10;
    jest.useFakeTimers();

    const wrapper = mountWithIntl(
      <ThresholdVisualization
        ruleParams={ruleParams}
        alertInterval="1m"
        aggregationTypes={builtInAggregationTypes}
        comparators={builtInComparators}
        charts={chartsStartMock}
        dataFieldsFormats={dataMock.fieldFormats}
        refreshRateInMilliseconds={refreshRate}
      />
    );

    await act(async () => {
      await nextTick();
      wrapper.update();
    });
    expect(getThresholdAlertVisualizationData).toHaveBeenCalledTimes(1);

    for (let i = 1; i <= 5; i++) {
      await act(async () => {
        jest.advanceTimersByTime(refreshRate);
        await nextTick();
        wrapper.update();
      });
      expect(getThresholdAlertVisualizationData).toHaveBeenCalledTimes(i + 1);
    }
  });

  test('renders loading message on initial load', async () => {
    const wrapper = mountWithIntl(
      <ThresholdVisualization
        ruleParams={ruleParams}
        alertInterval="1m"
        aggregationTypes={builtInAggregationTypes}
        comparators={builtInComparators}
        charts={chartsStartMock}
        dataFieldsFormats={dataMock.fieldFormats}
      />
    );
    expect(wrapper.find('[data-test-subj="firstLoad"]').exists()).toBeTruthy();

    await act(async () => {
      await nextTick();
      wrapper.update();
    });

    expect(wrapper.find('[data-test-subj="firstLoad"]').exists()).toBeFalsy();
    expect(getThresholdAlertVisualizationData).toHaveBeenCalled();
  });

  test('renders chart when visualization results are available', async () => {
    const wrapper = await setup();

    expect(wrapper.find('[data-test-subj="alertVisualizationChart"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="noDataCallout"]').exists()).toBeFalsy();
    expect(wrapper.find(Chart)).toHaveLength(1);
    expect(wrapper.find(LineSeries)).toHaveLength(1);
    expect(wrapper.find(LineAnnotation)).toHaveLength(1);
  });

  test('renders multiple line series chart when visualization results contain multiple groups', async () => {
    getThresholdAlertVisualizationData.mockImplementation(() =>
      Promise.resolve({
        results: [
          { group: 'a', metrics: [['b', 2]] },
          { group: 'a', metrics: [['b', 10]] },
          { group: 'c', metrics: [['d', 1]] },
        ],
      })
    );

    const wrapper = await setup();

    expect(wrapper.find('[data-test-subj="alertVisualizationChart"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="noDataCallout"]').exists()).toBeFalsy();
    expect(wrapper.find(Chart)).toHaveLength(1);
    expect(wrapper.find(LineSeries)).toHaveLength(2);
    expect(wrapper.find(LineAnnotation)).toHaveLength(1);
  });

  test('renders error callout with message when getting visualization fails', async () => {
    const errorMessage = 'oh no';
    getThresholdAlertVisualizationData.mockImplementation(() =>
      Promise.reject(new Error(errorMessage))
    );
    const wrapper = await setup();

    await act(async () => {
      await nextTick();
      wrapper.update();
    });

    expect(wrapper.find('[data-test-subj="errorCallout"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="errorCallout"]').first().text()).toBe(
      `Cannot load alert visualization${errorMessage}`
    );
  });

  test('renders error callout even when unable to get message from error', async () => {
    getThresholdAlertVisualizationData.mockImplementation(() =>
      Promise.reject(new Error(undefined))
    );
    const wrapper = await setup();

    await act(async () => {
      await nextTick();
      wrapper.update();
    });

    expect(wrapper.find('[data-test-subj="errorCallout"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="errorCallout"]').first().text()).toBe(
      `Cannot load alert visualization`
    );
  });

  test('renders no data message when visualization results are empty', async () => {
    getThresholdAlertVisualizationData.mockImplementation(() => Promise.resolve({ results: [] }));
    const wrapper = await setup();

    expect(wrapper.find('[data-test-subj="alertVisualizationChart"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="noDataCallout"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="noDataCallout"]').first().text()).toBe(
      `No data matches this queryCheck that your time range and filters are correct.`
    );
  });
});
