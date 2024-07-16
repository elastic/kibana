/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mountWithIntl, nextTick } from '@kbn/test-jest-helpers';
import React from 'react';
import { act } from 'react-dom/test-utils';

import { Aggregators } from '../../../../common/custom_threshold_rule/types';
import { MetricExpression } from '../types';
import { ExpressionRow } from './expression_row';
import { COMPARATORS } from '@kbn/alerting-comparators';

describe('ExpressionRow', () => {
  async function setup(expression: MetricExpression) {
    const wrapper = mountWithIntl(
      <ExpressionRow
        title={<>Condition</>}
        canDelete={false}
        fields={[
          {
            name: 'system.cpu.user.pct',
            type: 'test',
          },
          {
            name: 'system.load.1',
            type: 'test',
          },
        ]}
        remove={() => {}}
        addExpression={() => {}}
        key={1}
        expressionId={1}
        setRuleParams={() => {}}
        errors={{
          aggField: [],
          timeSizeUnit: [],
          timeWindowSize: [],
        }}
        expression={expression}
        dataView={{ fields: [], title: 'metricbeat-*' }}
      />
    );

    const update = async () =>
      await act(async () => {
        await nextTick();
        wrapper.update();
      });

    await update();

    return { wrapper, update };
  }

  it('should display thresholds as a percentage for pct metrics', async () => {
    const expression: MetricExpression = {
      comparator: COMPARATORS.GREATER_THAN,
      metrics: [
        {
          name: 'A',
          aggType: Aggregators.COUNT,
          field: 'system.cpu.user.pct',
        },
      ],
      threshold: [0.5],
      timeSize: 1,
      timeUnit: 'm',
    };
    const { wrapper, update } = await setup(expression);
    await update();
    const [valueMatch] =
      wrapper
        .html()
        .match(
          '<span class="euiExpression__value css-uocz3u-euiExpression__value-columns">50%</span>'
        ) ?? [];
    expect(valueMatch).toBeTruthy();
  });

  it('should display thresholds as a decimal for all other metrics', async () => {
    const expression = {
      comparator: COMPARATORS.GREATER_THAN,
      metrics: [
        {
          name: 'A',
          aggType: Aggregators.COUNT,
          field: 'system.load.1',
        },
      ],
      threshold: [0.5],
      timeSize: 1,
      timeUnit: 'm',
    };
    const { wrapper } = await setup(expression as MetricExpression);
    const [valueMatch] =
      wrapper
        .html()
        .match(
          '<span class="euiExpression__value css-uocz3u-euiExpression__value-columns">0.5</span>'
        ) ?? [];
    expect(valueMatch).toBeTruthy();
  });
});
