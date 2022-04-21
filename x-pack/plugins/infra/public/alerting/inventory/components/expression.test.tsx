/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mountWithIntl, nextTick, shallowWithIntl } from '@kbn/test-jest-helpers';
import React from 'react';
import { act } from 'react-dom/test-utils';
// We are using this inside a `jest.mock` call. Jest requires dynamic dependencies to be prefixed with `mock`
import { coreMock as mockCoreMock } from 'src/core/public/mocks';
import { Comparator, InventoryMetricConditions } from '../../../../common/alerting/metrics';
import { SnapshotCustomMetricInput } from '../../../../common/http_api/snapshot_api';
import { AlertContextMeta, defaultExpression, ExpressionRow, Expressions } from './expression';
import { dataViewPluginMocks } from 'src/plugins/data_views/public/mocks';

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

const dataViewMock = dataViewPluginMocks.createStartContract();

describe('Expression', () => {
  async function setup(currentOptions: AlertContextMeta) {
    const ruleParams = {
      criteria: [],
      nodeType: undefined,
      filterQueryText: '',
    };
    const wrapper = mountWithIntl(
      <Expressions
        ruleInterval="1m"
        ruleThrottle="1m"
        alertNotifyWhen="onThrottleInterval"
        ruleParams={ruleParams as any}
        errors={{}}
        setRuleParams={(key, value) => Reflect.set(ruleParams, key, value)}
        setRuleProperty={() => {}}
        metadata={currentOptions}
        dataViews={dataViewMock}
      />
    );

    const update = async () =>
      await act(async () => {
        await nextTick();
        wrapper.update();
      });

    await update();

    return { wrapper, update, ruleParams };
  }

  it('should prefill the alert using the context metadata', async () => {
    const currentOptions = {
      filter: 'foo',
      nodeType: 'pod',
      customMetrics: [],
      options: { metric: { type: 'memory' } },
    };
    const { ruleParams } = await setup(currentOptions as AlertContextMeta);
    expect(ruleParams.nodeType).toBe('pod');
    expect(ruleParams.filterQueryText).toBe('foo');
    expect(ruleParams.criteria).toEqual([
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

    const ruleParams = {
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
        ruleInterval="1m"
        ruleThrottle="1m"
        alertNotifyWhen="onThrottleInterval"
        ruleParams={ruleParams as any}
        errors={{}}
        setRuleParams={(key, value) => Reflect.set(ruleParams, key, value)}
        setRuleProperty={() => {}}
        metadata={{}}
        dataViews={dataViewMock}
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
      const { ruleParams, update } = await setup(currentOptions as AlertContextMeta);
      await update();
      expect(ruleParams.nodeType).toBe('tx');
      expect(ruleParams.filterQueryText).toBe('');
      expect(ruleParams.criteria).toEqual([
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
        setRuleParams={() => {}}
        errors={{
          aggField: [],
          timeSizeUnit: [],
          timeWindowSize: [],
          metric: [],
        }}
        expression={expression}
        fields={[
          {
            name: 'some.system.field',
            type: 'bzzz',
            searchable: true,
            aggregatable: true,
            displayable: true,
          },
        ]}
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
