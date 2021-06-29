/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mountWithIntl, nextTick } from '@kbn/test/jest';
// We are using this inside a `jest.mock` call. Jest requires dynamic dependencies to be prefixed with `mock`
import { coreMock as mockCoreMock } from 'src/core/public/mocks';
import React from 'react';
import { Expression, AlertContextMeta } from './expression';
import { act } from 'react-dom/test-utils';

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

describe('Expression', () => {
  async function setup(currentOptions: AlertContextMeta) {
    const alertParams = {
      metric: undefined,
      nodeType: undefined,
      threshold: 50,
    };
    const wrapper = mountWithIntl(
      <Expression
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
      nodeType: 'pod',
      metric: { type: 'tx' },
    };
    const { alertParams } = await setup(currentOptions as AlertContextMeta);
    expect(alertParams.nodeType).toBe('k8s');
    expect(alertParams.metric).toBe('network_out');
  });
});
