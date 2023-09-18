/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ReactElement } from 'react';
import { act } from 'react-dom/test-utils';
import { LineAnnotation, RectAnnotation } from '@elastic/charts';
import { DataViewBase } from '@kbn/es-query';
import { mountWithIntl, nextTick } from '@kbn/test-jest-helpers';
// We are using this inside a `jest.mock` call. Jest requires dynamic dependencies to be prefixed with `mock`
import { coreMock as mockCoreMock } from '@kbn/core/public/mocks';
import { MetricExpression } from '../types';
import { ExpressionChart } from './expression_chart';
import { Aggregators, Comparator } from '../../../../common/custom_threshold_rule/types';

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

jest.mock('../hooks/use_metrics_explorer_chart_data', () => ({
  useMetricsExplorerChartData: () => ({ loading: false, data: { pages: [mockResponse] } }),
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
      aggType: Aggregators.AVERAGE,
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
