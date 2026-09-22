/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useDiscoverHref } from './use_discover_href';
import { useApmIndexSettingsContext } from '../../../../context/apm_index_settings/use_apm_index_settings_context';
import { useApmPluginContext } from '../../../../context/apm_plugin/use_apm_plugin_context';
import { DISCOVER_APP_LOCATOR } from '@kbn/deeplinks-analytics';
import { FETCH_STATUS } from '../../../../hooks/use_fetcher';

const MOCK_TRACES_INDEX = 'traces-apm-*';
const MOCK_ERROR_INDEX = 'logs-apm.error-*';

jest.mock('../../../../context/apm_index_settings/use_apm_index_settings_context');
jest.mock('../../../../context/apm_plugin/use_apm_plugin_context');

const mockUseApmIndexSettingsContext = useApmIndexSettingsContext as jest.MockedFunction<
  typeof useApmIndexSettingsContext
>;
const mockUseApmPluginContext = useApmPluginContext as jest.MockedFunction<
  typeof useApmPluginContext
>;

const mockGetRedirectUrl = jest.fn();
const mockLocatorGet = jest.fn().mockReturnValue({
  getRedirectUrl: mockGetRedirectUrl,
});

describe('useDiscoverHref', () => {
  beforeEach(() => {
    mockUseApmIndexSettingsContext.mockReturnValue({
      indexSettings: [
        {
          configurationName: 'transaction',
          defaultValue: MOCK_TRACES_INDEX,
        },
        {
          configurationName: 'span',
          savedValue: MOCK_TRACES_INDEX,
          defaultValue: 'traces-otel-*',
        },
        {
          configurationName: 'error',
          savedValue: MOCK_ERROR_INDEX,
          defaultValue: 'logs-apm.error-default-*',
        },
      ],
      indexSettingsStatus: FETCH_STATUS.SUCCESS,
    } as any);

    mockUseApmPluginContext.mockReturnValue({
      share: {
        url: {
          locators: {
            get: mockLocatorGet,
          },
        },
      },
    } as any);

    mockGetRedirectUrl.mockReturnValue('http://test-discover-url');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns the redirect URL when index settings are loaded', () => {
    const { result } = renderHook(() =>
      useDiscoverHref({
        indexType: 'traces',
        rangeFrom: 'now-15m',
        rangeTo: 'now',
        queryParams: { serviceName: 'my-service' },
      })
    );

    expect(result.current).toBe('http://test-discover-url');
    expect(mockLocatorGet).toHaveBeenCalledWith(DISCOVER_APP_LOCATOR);
    expect(mockGetRedirectUrl).toHaveBeenCalledWith({
      timeRange: { from: 'now-15m', to: 'now' },
      query: { esql: expect.any(String) },
    });
  });

  it('returns undefined when indexSettingsStatus is LOADING', () => {
    mockUseApmIndexSettingsContext.mockReturnValue({
      indexSettings: [],
      indexSettingsStatus: FETCH_STATUS.LOADING,
    } as any);

    const { result } = renderHook(() =>
      useDiscoverHref({
        indexType: 'traces',
        rangeFrom: 'now-15m',
        rangeTo: 'now',
        queryParams: { serviceName: 'my-service' },
      })
    );

    expect(result.current).toBeUndefined();
    expect(mockGetRedirectUrl).not.toHaveBeenCalled();
  });

  it('returns undefined when indexSettingsStatus is FAILURE', () => {
    mockUseApmIndexSettingsContext.mockReturnValue({
      indexSettings: [],
      indexSettingsStatus: FETCH_STATUS.FAILURE,
    } as any);

    const { result } = renderHook(() =>
      useDiscoverHref({
        indexType: 'traces',
        rangeFrom: 'now-15m',
        rangeTo: 'now',
        queryParams: {},
      })
    );

    expect(result.current).toBeUndefined();
  });

  it('returns undefined when getESQLQuery returns null (empty index settings)', () => {
    mockUseApmIndexSettingsContext.mockReturnValue({
      indexSettings: [],
      indexSettingsStatus: FETCH_STATUS.SUCCESS,
    } as any);

    const { result } = renderHook(() =>
      useDiscoverHref({
        indexType: 'traces',
        rangeFrom: 'now-15m',
        rangeTo: 'now',
        queryParams: {},
      })
    );

    expect(result.current).toBeUndefined();
    expect(mockGetRedirectUrl).not.toHaveBeenCalled();
  });

  it('passes the correct ESQL query with trace ID and sort direction', () => {
    renderHook(() =>
      useDiscoverHref({
        indexType: 'traces',
        rangeFrom: 'now-1h',
        rangeTo: 'now',
        queryParams: { traceId: 'abc-123', sortDirection: 'ASC' },
      })
    );

    const esqlArg = mockGetRedirectUrl.mock.calls[0][0].query.esql;
    expect(esqlArg).toContain(`FROM ${MOCK_TRACES_INDEX}`);
    expect(esqlArg).toContain('`trace.id` == "abc-123"');
    expect(esqlArg).toContain('SORT @timestamp ASC');
  });

  it('passes the correct time range to the locator', () => {
    renderHook(() =>
      useDiscoverHref({
        indexType: 'traces',
        rangeFrom: '2025-01-01T00:00:00.000Z',
        rangeTo: '2025-01-02T00:00:00.000Z',
        queryParams: { serviceName: 'my-service' },
      })
    );

    expect(mockGetRedirectUrl).toHaveBeenCalledWith(
      expect.objectContaining({
        timeRange: {
          from: '2025-01-01T00:00:00.000Z',
          to: '2025-01-02T00:00:00.000Z',
        },
      })
    );
  });

  it('uses the error index when indexType is error', () => {
    renderHook(() =>
      useDiscoverHref({
        indexType: 'error',
        rangeFrom: 'now-15m',
        rangeTo: 'now',
        queryParams: { serviceName: 'my-service', errorGroupId: 'error-123' },
      })
    );

    const esqlArg = mockGetRedirectUrl.mock.calls[0][0].query.esql;
    expect(esqlArg).toContain(`FROM ${MOCK_ERROR_INDEX}`);
    expect(esqlArg).not.toContain(MOCK_TRACES_INDEX);
  });

  it('returns undefined when the locator returns undefined', () => {
    mockLocatorGet.mockReturnValueOnce(undefined);

    const { result } = renderHook(() =>
      useDiscoverHref({
        indexType: 'traces',
        rangeFrom: 'now-15m',
        rangeTo: 'now',
        queryParams: { serviceName: 'my-service' },
      })
    );

    expect(result.current).toBeUndefined();
  });
});
