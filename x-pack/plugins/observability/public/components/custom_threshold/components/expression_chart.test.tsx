/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LineAnnotation, RectAnnotation } from '@elastic/charts';
// We are using this inside a `jest.mock` call. Jest requires dynamic dependencies to be prefixed with `mock`
import { coreMock as mockCoreMock } from '@kbn/core/public/mocks';
import { DataViewBase } from '@kbn/es-query';
import { mountWithIntl, nextTick } from '@kbn/test-jest-helpers';
import React, { ReactElement } from 'react';
import { act } from 'react-dom/test-utils';
import { Aggregators, Comparator } from '../../../../common/custom_threshold_rule/types';
import { MetricExpression } from '../types';
import { ExpressionChart } from './expression_chart';

const mockStartServices = mockCoreMock.createStart();

jest.mock('../../../utils/kibana_react', () => ({
  useKibana: () => ({
    services: {
      ...mockStartServices,
      charts: {
        activeCursor: jest.fn(),
      },
    },
  }),
}));

const mockResponse = {
  pageInfo: {
    afterKey: null,
    total: 0,
  },
  series: [{ id: 'Everything', rows: [], columns: [] }],
};

jest.mock('../hooks/use_expression_chart_data', () => ({
  useExpressionChartData: () => ({ loading: false, data: { pages: [mockResponse] } }),
}));

describe('ExpressionChart', () => {
  async function setup(
    expression: MetricExpression,
    filterQuery?: string,
    groupBy?: string,
    annotations?: Array<ReactElement<typeof RectAnnotation | typeof LineAnnotation>>
  ) {
    const derivedIndexPattern: DataViewBase = {
      title: 'metricbeat-*',
      fields: [],
    };

    const wrapper = mountWithIntl(
      <ExpressionChart
        expression={expression}
        derivedIndexPattern={derivedIndexPattern}
        filterQuery={filterQuery}
        groupBy={groupBy}
        annotations={annotations}
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

  it('should display no data message', async () => {
    const expression: MetricExpression = {
      metrics: [
        {
          name: 'A',
          aggType: Aggregators.COUNT,
        },
      ],
      timeSize: 1,
      timeUnit: 'm',
      sourceId: 'default',
      threshold: [1],
      comparator: Comparator.GT_OR_EQ,
    };
    const { wrapper } = await setup(expression);
    expect(wrapper.find('[data-test-subj~="thresholdRuleNoChartData"]').exists()).toBeTruthy();
  });
});
