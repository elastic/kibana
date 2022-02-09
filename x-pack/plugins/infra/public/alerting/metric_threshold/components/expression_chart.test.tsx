/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataViewBase } from '@kbn/es-query';
import { mountWithIntl, nextTick } from '@kbn/test-jest-helpers';
import React from 'react';
import { act } from 'react-dom/test-utils';
// We are using this inside a `jest.mock` call. Jest requires dynamic dependencies to be prefixed with `mock`
import { coreMock as mockCoreMock } from 'src/core/public/mocks';
import { Aggregators, Comparator } from '../../../../common/alerting/metrics';
import { MetricsSourceConfiguration } from '../../../../common/metrics_sources';
import { MetricExpression } from '../types';
import { ExpressionChart } from './expression_chart';

const mockStartServices = mockCoreMock.createStart();
jest.mock('../../../hooks/use_kibana', () => ({
  useKibanaContextForPlugin: () => ({
    services: {
      ...mockStartServices,
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
  useMetricsExplorerChartData: () => ({ loading: false, data: mockResponse }),
}));

describe('ExpressionChart', () => {
  async function setup(expression: MetricExpression, filterQuery?: string, groupBy?: string) {
    const derivedIndexPattern: DataViewBase = {
      title: 'metricbeat-*',
      fields: [],
    };

    const source: MetricsSourceConfiguration = {
      id: 'default',
      origin: 'fallback',
      configuration: {
        name: 'default',
        description: 'The default configuration',
        metricAlias: 'metricbeat-*',
        inventoryDefaultView: 'host',
        metricsExplorerDefaultView: 'host',
        anomalyThreshold: 20,
      },
    };

    const wrapper = mountWithIntl(
      <ExpressionChart
        expression={expression}
        derivedIndexPattern={derivedIndexPattern}
        source={source}
        filterQuery={filterQuery}
        groupBy={groupBy}
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
    expect(wrapper.find('[data-test-subj~="noChartData"]').exists()).toBeTruthy();
  });
});
