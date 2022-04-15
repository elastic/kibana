/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mountWithIntl, nextTick } from '@kbn/test-jest-helpers';
import { act } from 'react-dom/test-utils';
import IndexThresholdAlertTypeExpression, { DEFAULT_VALUES } from './expression';
import { dataPluginMock } from 'src/plugins/data/public/mocks';
import { dataViewPluginMocks } from 'src/plugins/data_views/public/mocks';
import { chartPluginMock } from 'src/plugins/charts/public/mocks';
import { IndexThresholdAlertParams } from './types';
import { validateExpression } from './validation';
import {
  builtInAggregationTypes,
  builtInComparators,
  getTimeUnitLabel,
  TIME_UNITS,
} from '../../../../triggers_actions_ui/public';

jest.mock('../../../../triggers_actions_ui/public', () => {
  const original = jest.requireActual('../../../../triggers_actions_ui/public');
  return {
    ...original,
    getIndexPatterns: () => {
      return ['index1', 'index2'];
    },
    getTimeFieldOptions: () => {
      return [
        {
          text: '@timestamp',
          value: '@timestamp',
        },
      ];
    },
    getFields: () => {
      return Promise.resolve([
        {
          name: '@timestamp',
          type: 'date',
        },
        {
          name: 'field',
          type: 'text',
        },
      ]);
    },
    getIndexOptions: () => {
      return Promise.resolve([
        {
          label: 'indexOption',
          options: [
            {
              label: 'index1',
              value: 'index1',
            },
            {
              label: 'index2',
              value: 'index2',
            },
          ],
        },
      ]);
    },
  };
});

const dataMock = dataPluginMock.createStartContract();
const dataViewMock = dataViewPluginMocks.createStartContract();
const chartsStartMock = chartPluginMock.createStartContract();

describe('IndexThresholdAlertTypeExpression', () => {
  function getAlertParams(overrides = {}) {
    return {
      index: 'test-index',
      aggType: 'count',
      thresholdComparator: '>',
      threshold: [0],
      timeWindowSize: 15,
      timeWindowUnit: 's',
      ...overrides,
    };
  }
  async function setup(ruleParams: IndexThresholdAlertParams) {
    const { errors } = validateExpression(ruleParams);

    const wrapper = mountWithIntl(
      <IndexThresholdAlertTypeExpression
        ruleInterval="1m"
        ruleThrottle="1m"
        alertNotifyWhen="onThrottleInterval"
        ruleParams={ruleParams}
        setRuleParams={() => {}}
        setRuleProperty={() => {}}
        errors={errors}
        data={dataMock}
        dataViews={dataViewMock}
        defaultActionGroupId=""
        actionGroups={[]}
        charts={chartsStartMock}
      />
    );

    await act(async () => {
      await nextTick();
      wrapper.update();
    });
    return wrapper;
  }

  test(`should render IndexThresholdAlertTypeExpression with expected components when aggType doesn't require field`, async () => {
    const wrapper = await setup(getAlertParams());
    expect(wrapper.find('[data-test-subj="indexSelectPopover"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="whenExpression"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="groupByExpression"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="aggTypeExpression"]').exists()).toBeFalsy();
    expect(wrapper.find('[data-test-subj="thresholdExpression"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="forLastExpression"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="visualizationPlaceholder"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="thresholdVisualization"]').exists()).toBeFalsy();
  });

  test(`should render IndexThresholdAlertTypeExpression with expected components when aggType does require field`, async () => {
    const wrapper = await setup(getAlertParams({ aggType: 'avg' }));
    expect(wrapper.find('[data-test-subj="indexSelectPopover"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="whenExpression"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="groupByExpression"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="aggTypeExpression"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="thresholdExpression"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="forLastExpression"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="visualizationPlaceholder"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="thresholdVisualization"]').exists()).toBeFalsy();
  });

  test(`should render IndexThresholdAlertTypeExpression with visualization when there are no expression errors`, async () => {
    const wrapper = await setup(getAlertParams({ timeField: '@timestamp' }));
    expect(wrapper.find('[data-test-subj="visualizationPlaceholder"]').exists()).toBeFalsy();
    expect(wrapper.find('[data-test-subj="thresholdVisualization"]').exists()).toBeTruthy();
  });

  test(`should set default alert params when params are undefined`, async () => {
    const wrapper = await setup(
      getAlertParams({
        aggType: undefined,
        thresholdComparator: undefined,
        timeWindowSize: undefined,
        timeWindowUnit: undefined,
        groupBy: undefined,
        threshold: undefined,
      })
    );

    expect(wrapper.find('button[data-test-subj="selectIndexExpression"]').text()).toEqual(
      'index test-index'
    );
    expect(wrapper.find('button[data-test-subj="whenExpression"]').text()).toEqual(
      `when ${builtInAggregationTypes[DEFAULT_VALUES.AGGREGATION_TYPE].text}`
    );
    expect(wrapper.find('button[data-test-subj="groupByExpression"]').text()).toEqual(
      `over ${DEFAULT_VALUES.GROUP_BY} documents `
    );
    expect(wrapper.find('[data-test-subj="aggTypeExpression"]').exists()).toBeFalsy();
    expect(wrapper.find('button[data-test-subj="thresholdPopover"]').text()).toEqual(
      `${builtInComparators[DEFAULT_VALUES.THRESHOLD_COMPARATOR].text} `
    );
    expect(wrapper.find('button[data-test-subj="forLastExpression"]').text()).toEqual(
      `for the last ${DEFAULT_VALUES.TIME_WINDOW_SIZE} ${getTimeUnitLabel(
        DEFAULT_VALUES.TIME_WINDOW_UNIT as TIME_UNITS,
        DEFAULT_VALUES.TIME_WINDOW_SIZE.toString()
      )}`
    );
    expect(
      wrapper.find('EuiEmptyPrompt[data-test-subj="visualizationPlaceholder"]').text()
    ).toEqual(`Complete the expression to generate a preview.`);
  });

  test(`should use alert params when params are defined`, async () => {
    const aggType = 'avg';
    const thresholdComparator = 'between';
    const timeWindowSize = 987;
    const timeWindowUnit = 's';
    const threshold = [3, 1003];
    const groupBy = 'top';
    const termSize = '27';
    const termField = 'host.name';
    const wrapper = await setup(
      getAlertParams({
        aggType,
        thresholdComparator,
        timeWindowSize,
        timeWindowUnit,
        termSize,
        termField,
        groupBy,
        threshold,
      })
    );

    expect(wrapper.find('button[data-test-subj="whenExpression"]').text()).toEqual(
      `when ${builtInAggregationTypes[aggType].text}`
    );
    expect(wrapper.find('button[data-test-subj="groupByExpression"]').text()).toEqual(
      `grouped over ${groupBy} ${termSize} '${termField}'`
    );

    expect(wrapper.find('button[data-test-subj="thresholdPopover"]').text()).toEqual(
      `${builtInComparators[thresholdComparator].text} ${threshold[0]} AND ${threshold[1]}`
    );
    expect(wrapper.find('button[data-test-subj="forLastExpression"]').text()).toEqual(
      `for the last ${timeWindowSize} ${getTimeUnitLabel(
        timeWindowUnit as TIME_UNITS,
        timeWindowSize.toString()
      )}`
    );
    expect(
      wrapper.find('EuiEmptyPrompt[data-test-subj="visualizationPlaceholder"]').text()
    ).toEqual(`Complete the expression to generate a preview.`);
  });
});
