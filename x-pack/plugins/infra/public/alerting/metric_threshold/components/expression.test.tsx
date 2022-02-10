/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mountWithIntl, nextTick } from '@kbn/test-jest-helpers';
import React from 'react';
import { act } from 'react-dom/test-utils';
// We are using this inside a `jest.mock` call. Jest requires dynamic dependencies to be prefixed with `mock`
import { coreMock as mockCoreMock } from 'src/core/public/mocks';
import { Comparator } from '../../../../common/alerting/metrics';
import { MetricsExplorerMetric } from '../../../../common/http_api/metrics_explorer';
import { Expressions } from './expression';

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

describe('Expression', () => {
  async function setup(currentOptions: {
    metrics?: MetricsExplorerMetric[];
    filterQuery?: string;
    groupBy?: string;
  }) {
    const ruleParams = {
      criteria: [],
      groupBy: undefined,
      filterQueryText: '',
      sourceId: 'default',
    };
    const wrapper = mountWithIntl(
      <Expressions
        ruleInterval="1m"
        ruleThrottle="1m"
        alertNotifyWhen="onThrottleInterval"
        ruleParams={ruleParams}
        errors={{}}
        setRuleParams={(key, value) => Reflect.set(ruleParams, key, value)}
        setRuleProperty={() => {}}
        metadata={{
          currentOptions,
        }}
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
      groupBy: 'host.hostname',
      filterQuery: 'foo',
      metrics: [
        { aggregation: 'avg', field: 'system.load.1' },
        { aggregation: 'cardinality', field: 'system.cpu.user.pct' },
      ] as MetricsExplorerMetric[],
    };
    const { ruleParams } = await setup(currentOptions);
    expect(ruleParams.groupBy).toBe('host.hostname');
    expect(ruleParams.filterQueryText).toBe('foo');
    expect(ruleParams.criteria).toEqual([
      {
        metric: 'system.load.1',
        comparator: Comparator.GT,
        threshold: [],
        timeSize: 1,
        timeUnit: 'm',
        aggType: 'avg',
      },
      {
        metric: 'system.cpu.user.pct',
        comparator: Comparator.GT,
        threshold: [],
        timeSize: 1,
        timeUnit: 'm',
        aggType: 'cardinality',
      },
    ]);
  });
});
