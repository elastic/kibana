/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mountWithIntl, shallowWithIntl, nextTick } from '@kbn/test/jest';
// We are using this inside a `jest.mock` call. Jest requires dynamic dependencies to be prefixed with `mock`
import { coreMock as mockCoreMock } from 'src/core/public/mocks';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { InventoryMetricConditions } from '../../../../server/lib/alerting/inventory_metric_threshold/types';
import React from 'react';
import { Expressions, AlertContextMeta, ExpressionRow, defaultExpression } from './expression';
import { act } from 'react-dom/test-utils';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { Comparator } from '../../../../server/lib/alerting/metric_threshold/types';
import { SnapshotCustomMetricInput } from '../../../../common/http_api/snapshot_api';

jest.mock('../../../containers/metrics_source/use_source_via_http', () => ({
  useSourceViaHttp: () => ({
    source: { id: 'default' },
    createDerivedIndexPattern: () => ({ fields: [], title: 'metricbeat-*' }),
  }),
}));

jest.mock('../../../hooks/use_kibana', () => ({
  useKibanaContextForPlugin: () => ({
    services: mockCoreMock.createStart(),
  }),
}));

const exampleCustomMetric = {
  id: 'this-is-an-id',
  field: 'some.system.field',
  aggregation: 'rate',
  type: 'custom',
} as SnapshotCustomMetricInput;

describe('Expression', () => {
  async function setup(currentOptions: AlertContextMeta) {
    const alertParams = {
      criteria: [],
      nodeType: undefined,
      filterQueryText: '',
    };
    const wrapper = mountWithIntl(
      <Expressions
        alertInterval="1m"
        alertThrottle="1m"
        alertNotifyWhen="onThrottleInterval"
        alertParams={alertParams as any}
        errors={{}}
        setAlertParams={(key, value) => Reflect.set(alertParams, key, value)}
        setAlertProperty={() => {}}
        metadata={currentOptions}
      />
    );

    const update = async () =>
      await act(async () => {
        await nextTick();
        wrapper.update();
      });

    await update();

    return { wrapper, update, alertParams };
  }

  it('should prefill the alert using the context metadata', async () => {
    const currentOptions = {
      filter: 'foo',
      nodeType: 'pod',
      customMetrics: [],
      options: { metric: { type: 'memory' } },
    };
    const { alertParams } = await setup(currentOptions as AlertContextMeta);
    expect(alertParams.nodeType).toBe('pod');
    expect(alertParams.filterQueryText).toBe('foo');
    expect(alertParams.criteria).toEqual([
      {
        metric: 'memory',
        comparator: Comparator.GT,
        threshold: [],
        timeSize: 1,
        timeUnit: 'm',
        customMetric: defaultExpression.customMetric,
      },
    ]);
  });

  it('should pass the elasticsearch query to the expression chart', async () => {
    const FILTER_QUERY =
      '{"bool":{"should":[{"match_phrase":{"host.name":"testHostName"}}],"minimum_should_match":1}}';

    const alertParams = {
      criteria: [
        {
          metric: 'cpu',
          timeSize: 1,
          timeUnit: 'm',
          threshold: [10],
          comparator: Comparator.GT,
        },
      ],
      nodeType: undefined,
      filterQueryText: 'host.name: "testHostName"',
      filterQuery: FILTER_QUERY,
    };

    const wrapper = shallowWithIntl(
      <Expressions
        alertInterval="1m"
        alertThrottle="1m"
        alertNotifyWhen="onThrottleInterval"
        alertParams={alertParams as any}
        errors={{}}
        setAlertParams={(key, value) => Reflect.set(alertParams, key, value)}
        setAlertProperty={() => {}}
        metadata={{}}
      />
    );

    const chart = wrapper.find('[data-test-subj="preview-chart"]');

    expect(chart.prop('filterQuery')).toBe(FILTER_QUERY);
  });

  describe('using custom metrics', () => {
    it('should prefill the alert using the context metadata', async () => {
      const currentOptions = {
        filter: '',
        nodeType: 'tx',
        customMetrics: [exampleCustomMetric],
        options: { metric: exampleCustomMetric },
      };
      const { alertParams, update } = await setup(currentOptions as AlertContextMeta);
      await update();
      expect(alertParams.nodeType).toBe('tx');
      expect(alertParams.filterQueryText).toBe('');
      expect(alertParams.criteria).toEqual([
        {
          metric: 'custom',
          comparator: Comparator.GT,
          threshold: [],
          timeSize: 1,
          timeUnit: 'm',
          customMetric: exampleCustomMetric,
        },
      ]);
    });
  });
});

describe('ExpressionRow', () => {
  async function setup(expression: InventoryMetricConditions) {
    const wrapper = mountWithIntl(
      <ExpressionRow
        nodeType="host"
        canDelete={false}
        remove={() => {}}
        addExpression={() => {}}
        key={1}
        expressionId={1}
        setAlertParams={() => {}}
        errors={{
          aggField: [],
          timeSizeUnit: [],
          timeWindowSize: [],
          metric: [],
        }}
        expression={expression}
        fields={[{ name: 'some.system.field', type: 'bzzz' }]}
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
  const expression = {
    metric: 'custom',
    comparator: Comparator.GT,
    threshold: [],
    timeSize: 1,
    timeUnit: 'm',
    customMetric: exampleCustomMetric,
  };

  it('loads custom metrics passed in through the expression, even with an empty context', async () => {
    const { wrapper } = await setup(expression as InventoryMetricConditions);
    const [valueMatch] =
      wrapper.html().match('<span class="euiExpression__value">Rate of some.system.field</span>') ??
      [];
    expect(valueMatch).toBeTruthy();
  });
});
