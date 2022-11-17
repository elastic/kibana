/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as React from 'react';
import { mountWithIntl, nextTick } from '@kbn/test-jest-helpers';
import { act } from 'react-dom/test-utils';
import { ExecutionDurationChart, padOrTruncateDurations } from './execution_duration_chart';

describe('execution duration chart', () => {
  it('renders empty state when no execution duration values are available', async () => {
    const executionDuration = mockExecutionDuration();

    const wrapper = mountWithIntl(
      <ExecutionDurationChart
        executionDuration={executionDuration}
        numberOfExecutions={60}
        onChangeDuration={() => {}}
      />
    );

    await act(async () => {
      await nextTick();
      wrapper.update();
    });

    expect(wrapper.find('[data-test-subj="executionDurationChartPanel"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="executionDurationChartEmpty"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="executionDurationChart"]').exists()).toBeFalsy();
  });

  it('renders chart when execution duration values are available', async () => {
    const executionDuration = mockExecutionDuration({
      average: 10,
      valuesWithTimestamp: { '17 Nov 2021 @ 19:19:17': 1, '17 Nov 2021 @ 20:19:17': 2 },
    });

    const wrapper = mountWithIntl(
      <ExecutionDurationChart
        executionDuration={executionDuration}
        numberOfExecutions={60}
        onChangeDuration={() => {}}
      />
    );

    await act(async () => {
      await nextTick();
      wrapper.update();
    });

    expect(wrapper.find('[data-test-subj="executionDurationChartPanel"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="executionDurationChartEmpty"]').exists()).toBeFalsy();
    expect(wrapper.find('[data-test-subj="executionDurationChart"]').exists()).toBeTruthy();
  });
});

describe('padOrTruncateDurations', () => {
  it('does nothing when array is the correct length', () => {
    expect(
      padOrTruncateDurations(
        { '17 Nov 2021 @ 16:16:17': 1, '17 Nov 2021 @ 16:17:17': 2, '17 Nov 2021 @ 19:19:17': 3 },
        3
      )
    ).toEqual([
      ['17 Nov 2021 @ 16:16:17', 1],
      ['17 Nov 2021 @ 16:17:17', 2],
      ['17 Nov 2021 @ 19:19:17', 3],
    ]);
  });

  it('pads execution duration values when there are fewer than display desires', () => {
    expect(
      padOrTruncateDurations(
        { '17 Nov 2021 @ 16:16:17': 1, '17 Nov 2021 @ 16:17:17': 2, '17 Nov 2021 @ 19:19:17': 3 },
        10
      )
    ).toEqual([
      ['17 Nov 2021 @ 16:16:17', 1],
      ['17 Nov 2021 @ 16:17:17', 2],
      ['17 Nov 2021 @ 19:19:17', 3],
      [null, null],
      [null, null],
      [null, null],
      [null, null],
      [null, null],
      [null, null],
      [null, null],
    ]);
  });

  it('truncates execution duration values when there are more than display desires', () => {
    expect(
      padOrTruncateDurations(
        {
          '17 Nov 2021 @ 16:16:17': 1,
          '17 Nov 2021 @ 16:17:17': 2,
          '17 Nov 2021 @ 19:19:17': 3,
          '17 Nov 2021 @ 20:19:17': 4,
          '17 Nov 2021 @ 21:19:17': 5,
          '17 Nov 2021 @ 22:19:17': 6,
          '17 Nov 2021 @ 23:19:17': 7,
          '18 Nov 2021 @ 19:19:17': 8,
          '19 Nov 2021 @ 19:19:17': 9,
          '19 Nov 2021 @ 20:19:17': 10,
          '19 Nov 2021 @ 21:19:17': 11,
          '20 Nov 2021 @ 19:19:17': 12,
          '20 Nov 2021 @ 20:19:17': 13,
        },
        10
      )
    ).toEqual([
      ['17 Nov 2021 @ 20:19:17', 4],
      ['17 Nov 2021 @ 21:19:17', 5],
      ['17 Nov 2021 @ 22:19:17', 6],
      ['17 Nov 2021 @ 23:19:17', 7],
      ['18 Nov 2021 @ 19:19:17', 8],
      ['19 Nov 2021 @ 19:19:17', 9],
      ['19 Nov 2021 @ 20:19:17', 10],
      ['19 Nov 2021 @ 21:19:17', 11],
      ['20 Nov 2021 @ 19:19:17', 12],
      ['20 Nov 2021 @ 20:19:17', 13],
    ]);
  });
});

function mockExecutionDuration(
  overwrites: {
    average?: number;
    valuesWithTimestamp?: Record<string, number>;
  } = {}
) {
  return {
    average: 0,
    valuesWithTimestamp: {},
    ...overwrites,
  };
}
