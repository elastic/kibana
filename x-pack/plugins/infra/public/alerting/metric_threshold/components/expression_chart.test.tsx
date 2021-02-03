/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mountWithIntl, nextTick } from '@kbn/test/jest';
// We are using this inside a `jest.mock` call. Jest requires dynamic dependencies to be prefixed with `mock`
import { coreMock as mockCoreMock } from 'src/core/public/mocks';
import { MetricExpression } from '../types';
import { IIndexPattern } from 'src/plugins/data/public';
import { InfraSource } from '../../../../common/http_api/source_api';
import React from 'react';
import { ExpressionChart } from './expression_chart';
import { act } from 'react-dom/test-utils';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { Aggregators, Comparator } from '../../../../server/lib/alerting/metric_threshold/types';

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
    const derivedIndexPattern: IIndexPattern = {
      title: 'metricbeat-*',
      fields: [],
    };

    const source: InfraSource = {
      id: 'default',
      origin: 'fallback',
      configuration: {
        name: 'default',
        description: 'The default configuration',
        logColumns: [],
        metricAlias: 'metricbeat-*',
        logAlias: 'filebeat-*',
        inventoryDefaultView: 'host',
        metricsExplorerDefaultView: 'host',
        fields: {
          timestamp: '@timestamp',
          message: ['message'],
          container: 'container.id',
          host: 'host.name',
          pod: 'kubernetes.pod.uid',
          tiebreaker: '_doc',
        },
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
