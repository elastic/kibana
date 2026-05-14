/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import type { ApmIndexSettingsResponse } from '@kbn/apm-sources-access-plugin/server/routes/settings';
import { useApmPluginContext } from '../../../context/apm_plugin/use_apm_plugin_context';
import { useTraceActions, type TraceGroup } from './use_trace_actions';

jest.mock('../../../context/apm_plugin/use_apm_plugin_context');

const mockUseApmPluginContext = useApmPluginContext as jest.MockedFunction<
  typeof useApmPluginContext
>;

const mockGetRedirectUrl = jest.fn<string | undefined, [unknown]>();
const mockLocatorGet = jest.fn().mockReturnValue({ getRedirectUrl: mockGetRedirectUrl });

const TRACES_INDEX = 'traces-apm-*';

const indexSettings: ApmIndexSettingsResponse['apmIndexSettings'] = [
  { configurationName: 'transaction', defaultValue: TRACES_INDEX, savedValue: undefined },
  { configurationName: 'span', defaultValue: TRACES_INDEX, savedValue: undefined },
];

const traceItem: TraceGroup = {
  key: { 'service.name': 'opbeans-go', 'transaction.name': 'GET /api/orders' },
  serviceName: 'opbeans-go',
  transactionName: 'GET /api/orders',
  transactionType: 'request',
  agentName: 'go',
  averageResponseTime: 10,
  transactionsPerMinute: 1,
  impact: 0,
};

const defaultParams = {
  kuery: '',
  environment: 'ENVIRONMENT_ALL',
  rangeFrom: 'now-15m',
  rangeTo: 'now',
  indexSettings,
};

function renderUseTraceActions(overrides: Partial<typeof defaultParams> = {}) {
  return renderHook(() => useTraceActions({ ...defaultParams, ...overrides }));
}

function getHrefFn(result: ReturnType<typeof useTraceActions>) {
  const action = result[0]?.actions[0];
  expect(action).toBeDefined();
  expect(action.href).toBeDefined();
  return action.href as (item: TraceGroup) => string | undefined;
}

describe('useTraceActions', () => {
  beforeEach(() => {
    mockUseApmPluginContext.mockReturnValue({
      share: { url: { locators: { get: mockLocatorGet } } },
    } as unknown as ReturnType<typeof useApmPluginContext>);

    mockGetRedirectUrl.mockReturnValue('http://test-discover-url');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns a discover action group with the Explore traces row action', () => {
    const { result } = renderUseTraceActions();

    expect(result.current).toHaveLength(1);
    expect(result.current[0].id).toBe('discover');
    expect(result.current[0].actions).toHaveLength(1);
    expect(result.current[0].actions[0]).toMatchObject({
      id: 'traceList-openInDiscover',
      name: 'Explore traces',
      icon: 'discoverApp',
    });
  });

  it('builds the Discover href with an ES|QL query filtered by service, transaction, and transaction type', () => {
    const { result } = renderUseTraceActions();
    const href = getHrefFn(result.current);

    expect(href(traceItem)).toBe('http://test-discover-url');
    expect(mockGetRedirectUrl).toHaveBeenCalledTimes(1);

    const [args] = mockGetRedirectUrl.mock.calls[0] as [
      { timeRange: { from: string; to: string }; query: { esql: string } }
    ];
    expect(args.timeRange).toEqual({ from: 'now-15m', to: 'now' });
    expect(args.query.esql).toContain(`FROM ${TRACES_INDEX}`);
    expect(args.query.esql).toContain('`service.name` == "opbeans-go"');
    expect(args.query.esql).toContain('`transaction.name` == "GET /api/orders"');
    expect(args.query.esql).toContain('`transaction.type` == "request"');
    expect(args.query.esql).toContain('SORT @timestamp DESC');
  });

  it('includes the environment filter when not ENVIRONMENT_ALL', () => {
    const { result } = renderUseTraceActions({ environment: 'production' });
    const href = getHrefFn(result.current);

    href(traceItem);

    const [args] = mockGetRedirectUrl.mock.calls[0] as [{ query: { esql: string } }];
    expect(args.query.esql).toContain('`service.environment` == "production"');
  });

  it('forwards a non-empty kuery as a KQL clause', () => {
    const { result } = renderUseTraceActions({ kuery: 'http.response.status_code : 500' });
    const href = getHrefFn(result.current);

    href(traceItem);

    const [args] = mockGetRedirectUrl.mock.calls[0] as [{ query: { esql: string } }];
    expect(args.query.esql).toContain('KQL("http.response.status_code : 500")');
  });

  it('returns an undefined href when there are no index settings', () => {
    const { result } = renderUseTraceActions({ indexSettings: [] });
    const href = getHrefFn(result.current);

    expect(href(traceItem)).toBeUndefined();
    expect(mockGetRedirectUrl).not.toHaveBeenCalled();
  });

  it('returns an undefined href when the Discover locator is not registered', () => {
    mockLocatorGet.mockReturnValueOnce(undefined);

    const { result } = renderUseTraceActions();
    const href = getHrefFn(result.current);

    expect(href(traceItem)).toBeUndefined();
    expect(mockGetRedirectUrl).not.toHaveBeenCalled();
  });

  it.each([
    ['serviceName', { ...traceItem, serviceName: '' }],
    ['transactionName', { ...traceItem, transactionName: '' }],
    ['transactionType', { ...traceItem, transactionType: '' }],
  ])(
    'returns an undefined href when %s is missing so the row link cannot accidentally broaden',
    (_label, item) => {
      const { result } = renderUseTraceActions();
      const href = getHrefFn(result.current);

      expect(href(item)).toBeUndefined();
      expect(mockGetRedirectUrl).not.toHaveBeenCalled();
    }
  );
});
