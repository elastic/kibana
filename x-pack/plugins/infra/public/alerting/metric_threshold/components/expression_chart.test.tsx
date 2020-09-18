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
import { IIndexPattern } from 'src/plugins/data/public';
import { InfraSource } from '../../../../common/http_api/source_api';
import React from 'react';
import { ExpressionChart } from './expression_chart';
import { act } from 'react-dom/test-utils';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { Aggregators, Comparator } from '../../../../server/lib/alerting/metric_threshold/types';
import { MetricsExplorerResponse } from '../../../../common/http_api';

describe('ExpressionChart', () => {
  async function setup(
    expression: MetricExpression,
    response: MetricsExplorerResponse | null,
    filterQuery?: string,
    groupBy?: string
  ) {
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
    };
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

    mocks.http.fetch.mockImplementation(() => Promise.resolve(response));

    const wrapper = mountWithIntl(
      <ExpressionChart
        context={context}
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

    return { wrapper, update, fetchMock: mocks.http.fetch };
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
    const response = {
      pageInfo: {
        afterKey: null,
        total: 0,
      },
      series: [{ id: 'Everything', rows: [], columns: [] }],
    };
    const { wrapper } = await setup(expression, response);
    expect(wrapper.find('[data-test-subj~="noChartData"]').exists()).toBeTruthy();
  });
});
