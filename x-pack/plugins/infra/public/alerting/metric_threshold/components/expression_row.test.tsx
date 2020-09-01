/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mountWithIntl, nextTick } from 'test_utils/enzyme_helpers';
import { MetricExpression } from '../types';
import React from 'react';
import { ExpressionRow } from './expression_row';
import { act } from 'react-dom/test-utils';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { Comparator } from '../../../../server/lib/alerting/metric_threshold/types';

jest.mock('../../../containers/source/use_source_via_http', () => ({
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
          { name: 'system.cpu.user.pct', type: 'test' },
          { name: 'system.load.1', type: 'test' },
        ]}
        remove={() => {}}
        addExpression={() => {}}
        key={1}
        expressionId={1}
        setAlertParams={() => {}}
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
    const { wrapper } = await setup(expression as MetricExpression);
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
});
