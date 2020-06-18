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
import { AlertContextMeta, MetricExpression } from '../types';
import { MetricsExplorerMetric } from '../../../../common/http_api/metrics_explorer';
import React from 'react';
import { Expressions, defaultExpression } from './expression';
import { act } from 'react-dom/test-utils';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { Comparator } from '../../../../server/lib/alerting/metric_threshold/types';
import { MetricsExplorerResponse } from '../../../../common/http_api';
import { validateMetricThreshold } from './validation';

describe('Expression', () => {
  async function setup(currentOptions: {
    metrics?: MetricsExplorerMetric[];
    filterQuery?: string;
    groupBy?: string;
  }) {
    const alertParams = {
      criteria: [defaultExpression],
    };

    const mocks = coreMock.createSetup();
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
      docLinks: mocks.docLinks,
      capabilities: {
        ...capabilities,
        actions: {
          delete: true,
          save: true,
          show: true,
        },
      },
      metadata: {
        currentOptions,
      },
    };

    const validationResult = validateMetricThreshold([alertParams.criteria]);

    const wrapper = mountWithIntl(
      <Expressions
        alertsContext={context}
        alertInterval="1m"
        alertParams={alertParams}
        errors={validationResult.errors}
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
      groupBy: 'host.hostname',
      filterQuery: 'foo',
      metrics: [{ aggregation: 'avg', field: 'system.load.1' }],
    };
    const { alertParams } = await setup(currentOptions);
    expect(alertParams.groupBy).toBe('host.hostname');
    expect(alertParams.filterQueryText).toBe('foo');
    expect(alertParams.criteria).toEqual([
      {
        metric: 'system.load.1',
        comparator: Comparator.GT,
        threshold: [],
        timeSize,
        timeUnit,
        aggType: 'avg',
      },
    ]);
  });
});
