/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mountWithIntl, nextTick } from '@kbn/test-jest-helpers';
import React from 'react';
import { act } from 'react-dom/test-utils';
import { Comparator } from '../../../../common/alerting/metrics';
import { MetricExpression } from '../types';
import { ExpressionRow } from './expression_row';

jest.mock('../../../containers/metrics_source/use_source_via_http', () => ({
  useSourceViaHttp: () => ({
    source: { id: 'default' },
    createDerivedIndexPattern: () => ({ fields: [], title: 'metricbeat-*' }),
  }),
}));

describe('ExpressionRow', () => {
  async function setup(expression: MetricExpression) {
    const wrapper = mountWithIntl(
      <ExpressionRow
        canDelete={false}
        fields={[
          {
            name: 'system.cpu.user.pct',
            type: 'test',
            searchable: true,
            aggregatable: true,
            displayable: true,
          },
          {
            name: 'system.load.1',
            type: 'test',
            searchable: true,
            aggregatable: true,
            displayable: true,
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
    const expression = {
      metric: 'system.cpu.user.pct',
      comparator: Comparator.GT,
      threshold: [0.5],
      timeSize: 1,
      timeUnit: 'm',
      aggType: 'avg',
    };
    const { wrapper, update } = await setup(expression as MetricExpression);
    await update();
    const [valueMatch] = wrapper.html().match('<span class="euiExpression__value">50</span>') ?? [];
    expect(valueMatch).toBeTruthy();
  });

  it('should display thresholds as a decimal for all other metrics', async () => {
    const expression = {
      metric: 'system.load.1',
      comparator: Comparator.GT,
      threshold: [0.5],
      timeSize: 1,
      timeUnit: 'm',
      aggType: 'avg',
    };
    const { wrapper } = await setup(expression as MetricExpression);
    const [valueMatch] =
      wrapper.html().match('<span class="euiExpression__value">0.5</span>') ?? [];
    expect(valueMatch).toBeTruthy();
  });

  it('should render a helpText for the of expression', async () => {
    const expression = {
      metric: 'system.load.1',
      comparator: Comparator.GT,
      threshold: [0.5],
      timeSize: 1,
      timeUnit: 'm',
      aggType: 'avg',
    } as MetricExpression;

    const { wrapper } = await setup(expression as MetricExpression);

    const helpText = wrapper.find('[data-test-subj="ofExpression"]').at(0).prop('helpText');

    expect(helpText).toMatchSnapshot();
  });
});
