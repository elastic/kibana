/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mountWithIntl, nextTick } from 'test_utils/enzyme_helpers';
import { actionTypeRegistryMock } from '../../../../../triggers_actions_ui/public/application/action_type_registry.mock';
import { alertTypeRegistryMock } from '../../../../../triggers_actions_ui/public/application/alert_type_registry.mock';
import { coreMock } from '../../../../../../../src/core/public/mocks';
import { AlertsContextValue } from '../../../../../triggers_actions_ui/public/application/context/alerts_context';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { InventoryMetricConditions } from '../../../../server/lib/alerting/inventory_metric_threshold/types';
import React from 'react';
import { Expressions, AlertContextMeta, ExpressionRow } from './expression';
import { act } from 'react-dom/test-utils';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { Comparator } from '../../../../server/lib/alerting/metric_threshold/types';
import { SnapshotCustomMetricInput } from '../../../../common/http_api/snapshot_api';

jest.mock('../../../containers/source/use_source_via_http', () => ({
  useSourceViaHttp: () => ({
    source: { id: 'default' },
    createDerivedIndexPattern: () => ({ fields: [], title: 'metricbeat-*' }),
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

    const mocks = coreMock.createSetup();
    const startMocks = coreMock.createStart();
    const [
      {
        application: { capabilities },
      },
    ] = await mocks.getStartServices();

    const context: AlertsContextValue<AlertContextMeta> = {
      http: mocks.http,
      toastNotifications: mocks.notifications.toasts,
      actionTypeRegistry: actionTypeRegistryMock.create() as any,
      alertTypeRegistry: alertTypeRegistryMock.create() as any,
      docLinks: startMocks.docLinks,
      capabilities: {
        ...capabilities,
        actions: {
          delete: true,
          save: true,
          show: true,
        },
      },
      metadata: currentOptions,
    };

    const wrapper = mountWithIntl(
      <Expressions
        alertsContext={context}
        alertInterval="1m"
        alertParams={alertParams as any}
        errors={[]}
        setAlertParams={(key, value) => Reflect.set(alertParams, key, value)}
        setAlertProperty={() => {}}
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
      },
    ]);
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
        alertsContextMetadata={{
          customMetrics: [],
        }}
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
