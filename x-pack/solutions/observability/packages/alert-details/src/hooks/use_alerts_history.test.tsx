/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { waitFor, renderHook } from '@testing-library/react';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { useAlertsHistory } from './use_alerts_history';

const queryClient = new QueryClient({
  logger: {
    log: () => {},
    warn: () => {},
    error: () => {},
  },
  defaultOptions: {
    queries: { retry: false, cacheTime: 0 },
  },
});

const mockServices = {
  http: httpServiceMock.createStartContract(),
};

const wrapper = ({ children }: any) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

describe('useAlertsHistory', () => {
  const start = '2023-04-10T00:00:00.000Z';
  const end = '2023-05-10T00:00:00.000Z';
  const ruleId = 'cfd36e60-ef22-11ed-91eb-b7893acacfe2';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns no data with error when http client is not provided', async () => {
    const http = undefined;
    const { result } = renderHook(
      () =>
        useAlertsHistory({
          http,
          ruleTypeIds: ['apm'],
          ruleId,
          dateRange: { from: start, to: end },
        }),
      {
        wrapper,
      }
    );
    await waitFor(() => expect(result.current.isError).toBeTruthy());
    expect(result.current.isSuccess).toBeFalsy();
    expect(result.current.isLoading).toBeFalsy();
  });

  it('returns no data when API error', async () => {
    mockServices.http.post.mockRejectedValueOnce(new Error('ES error'));
    const { result } = renderHook(
      () =>
        useAlertsHistory({
          ...mockServices,
          ruleTypeIds: ['apm'],
          ruleId,
          dateRange: { from: start, to: end },
        }),
      {
        wrapper,
      }
    );
    await waitFor(() => expect(result.current.isError).toBeTruthy());
    expect(result.current.isSuccess).toBeFalsy();
    expect(result.current.isLoading).toBeFalsy();
  });

  it('returns the alert history chart data', async () => {
    mockServices.http.post.mockResolvedValueOnce({
      hits: { total: { value: 32, relation: 'eq' }, max_score: null, hits: [] },
      aggregations: {
        avgTimeToRecoverUS: { doc_count: 28, recoveryTime: { value: 134959464.2857143 } },
        histogramTriggeredAlerts: {
          buckets: [
            { key_as_string: '2023-04-10T00:00:00.000Z', key: 1681084800000, doc_count: 0 },
            { key_as_string: '2023-04-11T00:00:00.000Z', key: 1681171200000, doc_count: 0 },
            { key_as_string: '2023-04-12T00:00:00.000Z', key: 1681257600000, doc_count: 0 },
            { key_as_string: '2023-04-13T00:00:00.000Z', key: 1681344000000, doc_count: 0 },
            { key_as_string: '2023-04-14T00:00:00.000Z', key: 1681430400000, doc_count: 0 },
            { key_as_string: '2023-04-15T00:00:00.000Z', key: 1681516800000, doc_count: 0 },
            { key_as_string: '2023-04-16T00:00:00.000Z', key: 1681603200000, doc_count: 0 },
            { key_as_string: '2023-04-17T00:00:00.000Z', key: 1681689600000, doc_count: 0 },
            { key_as_string: '2023-04-18T00:00:00.000Z', key: 1681776000000, doc_count: 0 },
            { key_as_string: '2023-04-19T00:00:00.000Z', key: 1681862400000, doc_count: 0 },
            { key_as_string: '2023-04-20T00:00:00.000Z', key: 1681948800000, doc_count: 0 },
            { key_as_string: '2023-04-21T00:00:00.000Z', key: 1682035200000, doc_count: 0 },
            { key_as_string: '2023-04-22T00:00:00.000Z', key: 1682121600000, doc_count: 0 },
            { key_as_string: '2023-04-23T00:00:00.000Z', key: 1682208000000, doc_count: 0 },
            { key_as_string: '2023-04-24T00:00:00.000Z', key: 1682294400000, doc_count: 0 },
            { key_as_string: '2023-04-25T00:00:00.000Z', key: 1682380800000, doc_count: 0 },
            { key_as_string: '2023-04-26T00:00:00.000Z', key: 1682467200000, doc_count: 0 },
            { key_as_string: '2023-04-27T00:00:00.000Z', key: 1682553600000, doc_count: 0 },
            { key_as_string: '2023-04-28T00:00:00.000Z', key: 1682640000000, doc_count: 0 },
            { key_as_string: '2023-04-29T00:00:00.000Z', key: 1682726400000, doc_count: 0 },
            { key_as_string: '2023-04-30T00:00:00.000Z', key: 1682812800000, doc_count: 0 },
            { key_as_string: '2023-05-01T00:00:00.000Z', key: 1682899200000, doc_count: 0 },
            { key_as_string: '2023-05-02T00:00:00.000Z', key: 1682985600000, doc_count: 0 },
            { key_as_string: '2023-05-03T00:00:00.000Z', key: 1683072000000, doc_count: 0 },
            { key_as_string: '2023-05-04T00:00:00.000Z', key: 1683158400000, doc_count: 0 },
            { key_as_string: '2023-05-05T00:00:00.000Z', key: 1683244800000, doc_count: 0 },
            { key_as_string: '2023-05-06T00:00:00.000Z', key: 1683331200000, doc_count: 0 },
            { key_as_string: '2023-05-07T00:00:00.000Z', key: 1683417600000, doc_count: 0 },
            { key_as_string: '2023-05-08T00:00:00.000Z', key: 1683504000000, doc_count: 0 },
            { key_as_string: '2023-05-09T00:00:00.000Z', key: 1683590400000, doc_count: 0 },
            { key_as_string: '2023-05-10T00:00:00.000Z', key: 1683676800000, doc_count: 32 },
          ],
        },
      },
    });

    const { result } = renderHook(
      () =>
        useAlertsHistory({
          ...mockServices,
          ruleTypeIds: ['apm'],
          ruleId,
          dateRange: { from: start, to: end },
        }),
      {
        wrapper,
      }
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.isLoading).toBeFalsy();
    expect(result.current.isError).toBeFalsy();
    expect(result.current.data.avgTimeToRecoverUS).toEqual(134959464.2857143);
    expect(result.current.data.histogramTriggeredAlerts?.length).toEqual(31);
    expect(result.current.data.totalTriggeredAlerts).toEqual(32);
  });

  it('calls http post including instanceId query', async () => {
    const controller = new AbortController();
    const signal = controller.signal;
    mockServices.http.post.mockResolvedValueOnce({
      hits: { total: { value: 32, relation: 'eq' }, max_score: null, hits: [] },
      aggregations: {
        avgTimeToRecoverUS: { doc_count: 28, recoveryTime: { value: 134959464.2857143 } },
        histogramTriggeredAlerts: {
          buckets: [
            { key_as_string: '2023-04-10T00:00:00.000Z', key: 1681084800000, doc_count: 0 },
          ],
        },
      },
    });

    const { result } = renderHook(
      () =>
        useAlertsHistory({
          ...mockServices,
          ruleTypeIds: ['apm'],
          consumers: ['foo'],
          ruleId,
          dateRange: { from: start, to: end },
          instanceId: 'instance-1',
        }),
      {
        wrapper,
      }
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockServices.http.post).toBeCalledWith('/internal/rac/alerts/find', {
      body:
        '{"size":0,"rule_type_ids":["apm"],"consumers":["foo"],"query":{"bool":{"must":[' +
        '{"term":{"kibana.alert.rule.uuid":"cfd36e60-ef22-11ed-91eb-b7893acacfe2"}},' +
        '{"term":{"kibana.alert.instance.id":"instance-1"}},' +
        '{"range":{"kibana.alert.time_range":{"gte":"2023-04-10T00:00:00.000Z","lte":"2023-05-10T00:00:00.000Z"}}}]}},' +
        '"aggs":{"histogramTriggeredAlerts":{"date_histogram":{"field":"kibana.alert.start","fixed_interval":"1d",' +
        '"extended_bounds":{"min":"2023-04-10T00:00:00.000Z","max":"2023-05-10T00:00:00.000Z"}}},' +
        '"avgTimeToRecoverUS":{"filter":{"term":{"kibana.alert.status":"recovered"}},' +
        '"aggs":{"recoveryTime":{"avg":{"field":"kibana.alert.duration.us"}}}}}}',
      signal,
    });
  });

  it('calls http post without * instanceId query', async () => {
    const controller = new AbortController();
    const signal = controller.signal;
    mockServices.http.post.mockResolvedValueOnce({
      hits: { total: { value: 32, relation: 'eq' }, max_score: null, hits: [] },
      aggregations: {
        avgTimeToRecoverUS: { doc_count: 28, recoveryTime: { value: 134959464.2857143 } },
        histogramTriggeredAlerts: {
          buckets: [
            { key_as_string: '2023-04-10T00:00:00.000Z', key: 1681084800000, doc_count: 0 },
          ],
        },
      },
    });

    const { result } = renderHook(
      () =>
        useAlertsHistory({
          ...mockServices,
          ruleTypeIds: ['apm'],
          ruleId,
          dateRange: { from: start, to: end },
          instanceId: '*',
        }),
      {
        wrapper,
      }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockServices.http.post).toBeCalledWith('/internal/rac/alerts/find', {
      body:
        '{"size":0,"rule_type_ids":["apm"],"query":{"bool":{"must":[' +
        '{"term":{"kibana.alert.rule.uuid":"cfd36e60-ef22-11ed-91eb-b7893acacfe2"}},' +
        '{"range":{"kibana.alert.time_range":{"gte":"2023-04-10T00:00:00.000Z","lte":"2023-05-10T00:00:00.000Z"}}}]}},' +
        '"aggs":{"histogramTriggeredAlerts":{"date_histogram":{"field":"kibana.alert.start","fixed_interval":"1d",' +
        '"extended_bounds":{"min":"2023-04-10T00:00:00.000Z","max":"2023-05-10T00:00:00.000Z"}}},' +
        '"avgTimeToRecoverUS":{"filter":{"term":{"kibana.alert.status":"recovered"}},' +
        '"aggs":{"recoveryTime":{"avg":{"field":"kibana.alert.duration.us"}}}}}}',
      signal,
    });
  });
});
