/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useServiceMap } from './use_service_map';
import { FETCH_STATUS } from '../../../hooks/use_fetcher';
import { useLicenseContext } from '../../../context/license/use_license_context';
import { useApmPluginContext } from '../../../context/apm_plugin/use_apm_plugin_context';
import { transformToReactFlow } from '../../../../common/service_map';
import { ENVIRONMENT_ALL } from '../../../../common/environment_filter_values';
import type { ReactFlowServiceMapResponse } from '../../../../common/service_map';
import { ApmDocumentType } from '../../../../common/document_type';
import { RollupInterval } from '../../../../common/rollup';
import { usePreferredServicesDataSource } from '../../../hooks/use_preferred_services_data_source';
import { useServiceMapGroupingEnabled } from '../../../hooks/use_service_map_grouping_enabled';

jest.mock('../../../context/license/use_license_context', () => ({
  useLicenseContext: jest.fn(),
}));

jest.mock('../../../context/apm_plugin/use_apm_plugin_context', () => ({
  useApmPluginContext: jest.fn(),
}));

jest.mock('../../../hooks/use_preferred_services_data_source', () => ({
  usePreferredServicesDataSource: jest.fn(),
}));

jest.mock('../../../hooks/use_service_map_grouping_enabled', () => ({
  useServiceMapGroupingEnabled: jest.fn(),
}));

const mockUseFetcher = jest.fn();
jest.mock('../../../hooks/use_fetcher', () => ({
  useFetcher: (fn: unknown) => mockUseFetcher(fn),
  FETCH_STATUS: {
    LOADING: 'loading',
    SUCCESS: 'success',
    FAILURE: 'failure',
    NOT_INITIATED: 'not_initiated',
  },
}));

jest.mock('../../../../common/service_map', () => {
  const original = jest.requireActual('../../../../common/service_map');
  return {
    ...original,
    transformToReactFlow: jest.fn(),
  };
});

const mockedUseLicenseContext = jest.mocked(useLicenseContext);
const mockedUseApmPluginContext = jest.mocked(useApmPluginContext);
const mockedTransformToReactFlow = jest.mocked(transformToReactFlow);
const mockedUsePreferredServicesDataSource = jest.mocked(usePreferredServicesDataSource);
const mockedUseServiceMapGroupingEnabled = jest.mocked(useServiceMapGroupingEnabled);
const defaultParams: Parameters<typeof useServiceMap>[0] = {
  start: '2026-01-01T00:00:00.000Z',
  end: '2026-01-01T01:00:00.000Z',
  environment: ENVIRONMENT_ALL.value,
  kuery: '',
};

describe('useServiceMap()', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockedUseLicenseContext.mockReturnValue({
      isActive: true,
      hasAtLeast: () => true,
    } as unknown as ReturnType<typeof useLicenseContext>);

    mockedUseApmPluginContext.mockReturnValue({
      config: {
        serviceMapEnabled: true,
      },
    } as ReturnType<typeof useApmPluginContext>);

    mockedUseServiceMapGroupingEnabled.mockReturnValue(false);
    mockedUsePreferredServicesDataSource.mockReturnValue(null);
  });

  it('returns transformed data for a successful fetch', () => {
    const apiResponse = { spans: [] };
    const transformedResponse: ReactFlowServiceMapResponse = {
      nodes: [],
      edges: [],
      nodesCount: 0,
      tracesCount: 1,
    };

    mockUseFetcher.mockReturnValue({
      data: apiResponse,
      status: FETCH_STATUS.SUCCESS,
    });
    mockedTransformToReactFlow.mockReturnValue(transformedResponse);

    const { result } = renderHook(() => useServiceMap(defaultParams));

    expect(mockedTransformToReactFlow).toHaveBeenCalledWith(apiResponse);
    expect(result.current).toEqual(
      expect.objectContaining({
        status: FETCH_STATUS.SUCCESS,
        data: transformedResponse,
      })
    );
  });

  describe('when fetch succeeds with malformed data', () => {
    it('does not return loading', () => {
      mockUseFetcher.mockReturnValue({
        data: { invalid: true },
        status: FETCH_STATUS.SUCCESS,
      });

      const { result } = renderHook(() => useServiceMap(defaultParams));

      expect(result.current.status).not.toBe(FETCH_STATUS.LOADING);
    });
  });

  describe('esQuery gating', () => {
    it('returns LOADING when esQuery is null (search bar not yet ready)', () => {
      mockUseFetcher.mockReturnValue({
        data: undefined,
        status: FETCH_STATUS.NOT_INITIATED,
      });

      const { result } = renderHook(() => useServiceMap({ ...defaultParams, esQuery: null }));

      expect(result.current.status).toBe(FETCH_STATUS.LOADING);
      expect(result.current.data.nodes).toHaveLength(0);
    });

    it('proceeds when esQuery is undefined (no search provider)', () => {
      const apiResponse = { spans: [] };
      const transformedResponse: ReactFlowServiceMapResponse = {
        nodes: [],
        edges: [],
        nodesCount: 0,
        tracesCount: 0,
      };

      mockUseFetcher.mockReturnValue({
        data: apiResponse,
        status: FETCH_STATUS.SUCCESS,
      });
      mockedTransformToReactFlow.mockReturnValue(transformedResponse);

      const { result } = renderHook(() => useServiceMap({ ...defaultParams, esQuery: undefined }));

      expect(result.current.status).toBe(FETCH_STATUS.SUCCESS);
    });
  });

  describe('strictEnvironmentScope', () => {
    const opbeansSpan = {
      spanId: 'span-1',
      spanType: 'external',
      spanSubtype: 'http',
      spanDestinationServiceResource: 'opbeans:3000',
      serviceName: 'opbeans-go',
      agentName: 'go',
      serviceEnvironment: 'opbeans',
    };
    const productionSpan = {
      spanId: 'span-2',
      spanType: 'external',
      spanSubtype: 'http',
      spanDestinationServiceResource: 'opbeans-dotnet',
      serviceName: 'opbeans-go',
      agentName: 'go',
      serviceEnvironment: 'opbeans',
      destinationService: {
        serviceName: 'opbeans-dotnet',
        agentName: 'dotnet' as const,
        serviceEnvironment: 'production',
      },
    };
    const apiResponse = { spans: [opbeansSpan, productionSpan] };
    const emptyTransformed: ReactFlowServiceMapResponse = {
      nodes: [],
      edges: [],
      nodesCount: 0,
      tracesCount: 1,
    };

    beforeEach(() => {
      mockUseFetcher.mockReturnValue({ data: apiResponse, status: FETCH_STATUS.SUCCESS });
      mockedTransformToReactFlow.mockReturnValue(emptyTransformed);
    });

    it('passes the raw response through to transform when off (default)', () => {
      renderHook(() => useServiceMap({ ...defaultParams, environment: 'opbeans' }));
      expect(mockedTransformToReactFlow).toHaveBeenCalledWith(apiResponse);
    });

    it('passes the raw response through when ENVIRONMENT_ALL is selected, even if enabled', () => {
      renderHook(() =>
        useServiceMap({
          ...defaultParams,
          environment: ENVIRONMENT_ALL.value,
          strictEnvironmentScope: true,
        })
      );
      expect(mockedTransformToReactFlow).toHaveBeenCalledWith(apiResponse);
    });

    it('drops cross-env spans before transform when enabled and env is specific', () => {
      renderHook(() =>
        useServiceMap({
          ...defaultParams,
          environment: 'opbeans',
          strictEnvironmentScope: true,
        })
      );

      const transformedArg = mockedTransformToReactFlow.mock.calls[0]?.[0];
      expect((transformedArg as { spans: unknown[] }).spans).toEqual([opbeansSpan]);
    });
  });
  describe('data source (service map grouping)', () => {
    const preferred = {
      bucketSizeInSeconds: 60,
      source: {
        documentType: ApmDocumentType.ServiceTransactionMetric as const,
        rollupInterval: RollupInterval.OneMinute,
        hasDocs: true,
        hasDurationSummaryField: true,
      },
    };

    // Runs the fetch callback, returning the API call it made, if any
    const renderAndGetApiCall = () => {
      const callApmApi = jest.fn().mockResolvedValue({ spans: [] });
      mockUseFetcher.mockImplementation((fn: (client: typeof callApmApi) => unknown) => {
        fn(callApmApi);
        return { data: undefined, status: FETCH_STATUS.NOT_INITIATED };
      });

      const { result } = renderHook(() => useServiceMap(defaultParams));
      return { result, apiCall: callApmApi.mock.calls[0] };
    };

    it('fetches without a source when grouping is disabled, even if one is available', () => {
      mockedUsePreferredServicesDataSource.mockReturnValue(preferred);

      const { apiCall } = renderAndGetApiCall();

      expect(apiCall[1].params.query).not.toHaveProperty('documentType');
      expect(apiCall[1].params.query).not.toHaveProperty('rollupInterval');
      expect(apiCall[1].params.query).not.toHaveProperty('useDurationSummary');
    });

    it('fetches without waiting for a source when grouping is disabled', () => {
      const { apiCall } = renderAndGetApiCall();

      expect(apiCall).toBeDefined();
    });

    it('waits for a source when grouping is enabled', () => {
      mockedUseServiceMapGroupingEnabled.mockReturnValue(true);

      const { result, apiCall } = renderAndGetApiCall();

      expect(apiCall).toBeUndefined();
      expect(result.current.status).toBe(FETCH_STATUS.LOADING);
    });

    it('sends the source when grouping is enabled', () => {
      mockedUseServiceMapGroupingEnabled.mockReturnValue(true);
      mockedUsePreferredServicesDataSource.mockReturnValue(preferred);

      const { apiCall } = renderAndGetApiCall();

      expect(apiCall[1].params.query).toEqual(
        expect.objectContaining({
          documentType: ApmDocumentType.ServiceTransactionMetric,
          rollupInterval: RollupInterval.OneMinute,
          useDurationSummary: true,
        })
      );
    });
  });
});
