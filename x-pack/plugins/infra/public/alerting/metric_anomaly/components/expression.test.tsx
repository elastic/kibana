/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mountWithIntl, nextTick } from '@kbn/test-jest-helpers';
// We are using this inside a `jest.mock` call. Jest requires dynamic dependencies to be prefixed with `mock`
import { coreMock as mockCoreMock } from 'src/core/public/mocks';
import React from 'react';
import { Expression, AlertContextMeta } from './expression';
import { act } from 'react-dom/test-utils';
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

jest.mock('../../../hooks/use_kibana_space', () => ({
  useActiveKibanaSpace: () => ({
    space: { id: 'default' },
  }),
}));

jest.mock('../../../containers/ml/infra_ml_capabilities', () => ({
  useInfraMLCapabilities: () => ({
    isLoading: false,
    hasInfraMLCapabilities: true,
  }),
}));

const dataViewMock = dataViewPluginMocks.createStartContract();

describe('Expression', () => {
  async function setup(currentOptions: AlertContextMeta) {
    const ruleParams = {
      metric: undefined,
      nodeType: undefined,
      threshold: 50,
    };
    const wrapper = mountWithIntl(
      <Expression
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
      nodeType: 'pod',
      metric: { type: 'tx' },
    };
    const { ruleParams } = await setup(currentOptions as AlertContextMeta);
    expect(ruleParams.nodeType).toBe('k8s');
    expect(ruleParams.metric).toBe('network_out');
  });
});
