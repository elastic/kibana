/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { kibanaStartMock } from '../utils/kibana_react.mock';
import * as pluginContext from './use_plugin_context';
import { createObservabilityRuleTypeRegistryMock } from '..';
import { PluginContextValue } from '../context/plugin_context/plugin_context';
import { AlertData, useFetchAlertDetail } from './use_fetch_alert_detail';

const mockUseKibanaReturnValue = kibanaStartMock.startContract();

jest.mock('../utils/kibana_react', () => ({
  __esModule: true,
  useKibana: jest.fn(() => mockUseKibanaReturnValue),
}));

describe('useFetchAlertDetail', () => {
  const getResult = {
    'kibana.alert.rule.category': 'Metric threshold',
    'kibana.alert.rule.consumer': 'infrastructure',
    'kibana.alert.rule.execution.uuid': 'e62c418d-734d-47e7-bbeb-e6f182f5fb45',
    'kibana.alert.rule.name': 'A super rule',
    'kibana.alert.rule.producer': 'infrastructure',
    'kibana.alert.rule.revision': 0,
    'kibana.alert.rule.rule_type_id': 'metrics.alert.threshold',
    'kibana.alert.rule.uuid': '69411af0-82a2-11ec-8139-c1568734434e',
    'kibana.space_ids': ['default'],
    'kibana.alert.rule.tags': [],
    '@timestamp': '2022-01-31T18:20:57.204Z',
    'kibana.alert.reason': 'Document count reported no data in the last 1 hour for all hosts',
    'kibana.alert.duration.us': 13793555000,
    'kibana.alert.instance.id': '*',
    'kibana.alert.start': '2022-01-31T14:31:03.649Z',
    'kibana.alert.uuid': '73c0d0cd-2df4-4550-862c-1d447e9c1db2',
    'kibana.alert.status': 'active',
    'kibana.alert.workflow_status': 'open',
    'event.kind': 'signal',
    'event.action': 'active',
    'kibana.version': '8.1.0',
    tags: [],
    _index: 'alert-index',
  };

  const id = '123';
  const ruleType = createObservabilityRuleTypeRegistryMock();

  beforeEach(() => {
    mockUseKibanaReturnValue.services.http.get.mockImplementation(async () => getResult);
    jest.spyOn(pluginContext, 'usePluginContext').mockImplementation(
      () =>
        ({
          observabilityRuleTypeRegistry: ruleType,
        } as unknown as PluginContextValue)
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('initially is not loading and does not have data', async () => {
    const { result } = renderHook<string, [boolean, AlertData | null]>(() =>
      useFetchAlertDetail(id)
    );

    expect(result.current).toEqual([true, null]);
  });

  it('returns no data when an error occurs', async () => {
    mockUseKibanaReturnValue.services.http.get.mockImplementation(async () => {
      throw new Error('an http error');
    });

    const { result } = renderHook<string, [boolean, AlertData | null]>(() =>
      useFetchAlertDetail('123')
    );

    await waitFor(() => null);

    expect(result.current).toEqual([false, null]);
  });

  it('retrieves the alert data', async () => {
    const { result } = renderHook<string, [boolean, AlertData | null]>(() =>
      useFetchAlertDetail(id)
    );

    await waitFor(() => null);

    expect(result.current).toMatchInlineSnapshot(`
      Array [
        false,
        Object {
          "formatted": Object {
            "0": "a",
            "1": " ",
            "2": "r",
            "3": "e",
            "4": "a",
            "5": "s",
            "6": "o",
            "7": "n",
            "active": true,
            "fields": Object {
              "@timestamp": "2022-01-31T18:20:57.204Z",
              "_index": "alert-index",
              "event.action": "active",
              "event.kind": "signal",
              "kibana.alert.duration.us": 13793555000,
              "kibana.alert.instance.id": "*",
              "kibana.alert.reason": "Document count reported no data in the last 1 hour for all hosts",
              "kibana.alert.rule.category": "Metric threshold",
              "kibana.alert.rule.consumer": "infrastructure",
              "kibana.alert.rule.execution.uuid": "e62c418d-734d-47e7-bbeb-e6f182f5fb45",
              "kibana.alert.rule.name": "A super rule",
              "kibana.alert.rule.producer": "infrastructure",
              "kibana.alert.rule.revision": 0,
              "kibana.alert.rule.rule_type_id": "metrics.alert.threshold",
              "kibana.alert.rule.tags": Array [],
              "kibana.alert.rule.uuid": "69411af0-82a2-11ec-8139-c1568734434e",
              "kibana.alert.start": "2022-01-31T14:31:03.649Z",
              "kibana.alert.status": "active",
              "kibana.alert.uuid": "73c0d0cd-2df4-4550-862c-1d447e9c1db2",
              "kibana.alert.workflow_status": "open",
              "kibana.space_ids": Array [
                "default",
              ],
              "kibana.version": "8.1.0",
              "tags": Array [],
            },
            "lastUpdated": 1643653257204,
            "link": undefined,
            "reason": "Document count reported no data in the last 1 hour for all hosts",
            "start": 1643639463649,
          },
          "raw": Object {
            "@timestamp": "2022-01-31T18:20:57.204Z",
            "_index": "alert-index",
            "event.action": "active",
            "event.kind": "signal",
            "kibana.alert.duration.us": 13793555000,
            "kibana.alert.instance.id": "*",
            "kibana.alert.reason": "Document count reported no data in the last 1 hour for all hosts",
            "kibana.alert.rule.category": "Metric threshold",
            "kibana.alert.rule.consumer": "infrastructure",
            "kibana.alert.rule.execution.uuid": "e62c418d-734d-47e7-bbeb-e6f182f5fb45",
            "kibana.alert.rule.name": "A super rule",
            "kibana.alert.rule.producer": "infrastructure",
            "kibana.alert.rule.revision": 0,
            "kibana.alert.rule.rule_type_id": "metrics.alert.threshold",
            "kibana.alert.rule.tags": Array [],
            "kibana.alert.rule.uuid": "69411af0-82a2-11ec-8139-c1568734434e",
            "kibana.alert.start": "2022-01-31T14:31:03.649Z",
            "kibana.alert.status": "active",
            "kibana.alert.uuid": "73c0d0cd-2df4-4550-862c-1d447e9c1db2",
            "kibana.alert.workflow_status": "open",
            "kibana.space_ids": Array [
              "default",
            ],
            "kibana.version": "8.1.0",
            "tags": Array [],
          },
        },
      ]
    `);
  });

  it('does not populate the results when the request is canceled', async () => {
    // FIXME: this test cases doesn't do what the suite claims it does

    const { result, unmount } = renderHook<string, [boolean, AlertData | null]>(() =>
      useFetchAlertDetail('123')
    );

    await waitFor(() => null);

    act(() => {
      unmount();
    });

    expect(result.current).toEqual([false, null]);
  });
});
