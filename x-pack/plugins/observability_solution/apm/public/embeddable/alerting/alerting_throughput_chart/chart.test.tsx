/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { TopAlert } from '@kbn/observability-plugin/public';
import { Rule } from '@kbn/alerting-plugin/common';
import { render, waitFor } from '@testing-library/react';
import { APMAlertingThroughputChart } from './chart';
import { ApmEmbeddableContext, ApmEmbeddableContextProps } from '../../embeddable_context';
import { mockApmPluginContextValue } from '../../../context/apm_plugin/mock_apm_plugin_context';

const mockPluginContext = mockApmPluginContextValue;
jest.mock('../../../context/apm_service/use_service_transaction_types_fetcher', () => ({
  useServiceTransactionTypesFetcher: jest.fn(() => ({
    transactionTypes: ['request'],
  })),
}));

jest.mock('../../../context/apm_service/use_service_agent_fetcher', () => ({
  useServiceAgentFetcher: jest.fn(() => ({
    agentName: 'mockAgent',
  })),
}));

describe('renders chart', () => {
  const deps: ApmEmbeddableContextProps['deps'] = {
    pluginsSetup: mockPluginContext.plugins,
    pluginsStart: mockPluginContext.corePlugins,
    coreStart: mockPluginContext.core,
    coreSetup: mockPluginContext.core,
  } as unknown as ApmEmbeddableContextProps['deps'];
  const serviceName = 'ops-bean';
  const rule = {
    ruleTypeId: 'slo.rules.burnRate',
    params: {
      sloId: '84ef850b-ea68-4bff-a3c8-dd522ca80f1c',
      windows: [
        {
          id: '481d7b88-bbc9-49c8-ae19-bf5ab9da0cf8',
          burnRateThreshold: 14.4,
          maxBurnRateThreshold: 720,
          longWindow: {
            value: 1,
            unit: 'h',
          },
          shortWindow: {
            value: 5,
            unit: 'm',
          },
          actionGroup: 'slo.burnRate.alert',
        },
      ],
    },
  } as unknown as Rule<never>;
  const alert = {
    link: '/app/slos/84ef850b-ea68-4bff-a3c8-dd522ca80f1c?instanceId=*',
    reason:
      'LOW: The burn rate for the past 72h is 70.54 and for the past 360m is 83.33. Alert when above 1 for both windows',
    fields: {
      'kibana.alert.reason':
        'LOW: The burn rate for the past 72h is 70.54 and for the past 360m is 83.33. Alert when above 1 for both windows',
      'kibana.alert.rule.category': 'SLO burn rate',
      'kibana.alert.rule.consumer': 'slo',
      'kibana.alert.rule.execution.uuid': '3560f989-f065-49af-9f1f-51b4d6cefc11',
      'kibana.alert.rule.name': 'APM SLO with a specific transaction name Burn Rate rule',
      'kibana.alert.rule.parameters': {},
      'kibana.alert.rule.producer': 'slo',
      'kibana.alert.rule.revision': 0,
      'kibana.alert.rule.rule_type_id': 'slo.rules.burnRate',
      'kibana.alert.duration.us': 23272406000,
      'kibana.alert.start': '2024-04-30T01:49:41.050Z',
      'kibana.alert.time_range': {
        gte: '2024-04-30T01:49:41.050Z',
        lte: '2024-04-30T08:17:33.456Z',
      },
      'kibana.version': '8.15.0',
      tags: [],
      'kibana.alert.end': '2024-04-30T08:17:33.456Z',
      'kibana.alert.evaluation.threshold': 1,
      'kibana.alert.evaluation.value': 70.53571428571422,
      'slo.id': '84ef850b-ea68-4bff-a3c8-dd522ca80f1c',
      'slo.revision': 1,
      'slo.instanceId': '*',
    },
    active: false,
    start: 1714441781050,
    lastUpdated: 1714483111432,
  } as unknown as TopAlert;
  it('renders error when serviceName is not defined', async () => {
    const { getByText } = render(
      <ApmEmbeddableContext deps={deps}>
        <APMAlertingThroughputChart
          rule={rule}
          rangeFrom="now-15m"
          rangeTo="now"
          // @ts-ignore
          serviceName={undefined}
          alert={alert}
        />
      </ApmEmbeddableContext>
    );
    await waitFor(() => {
      expect(getByText('Unable to load the APM visualizations.')).toBeInTheDocument();
    });
  });

  it('renders when serviceName is defined', async () => {
    const { getByText } = render(
      <ApmEmbeddableContext deps={deps}>
        <APMAlertingThroughputChart
          rule={rule}
          rangeFrom="now-15m"
          rangeTo="now"
          serviceName={serviceName}
          alert={alert}
        />
      </ApmEmbeddableContext>
    );
    await waitFor(() => {
      expect(getByText('Throughput')).toBeInTheDocument();
    });
  });
});
