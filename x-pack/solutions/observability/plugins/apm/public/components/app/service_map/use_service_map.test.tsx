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

jest.mock('../../../context/license/use_license_context', () => ({
  useLicenseContext: jest.fn(),
}));

jest.mock('../../../context/apm_plugin/use_apm_plugin_context', () => ({
  useApmPluginContext: jest.fn(),
}));

const mockUseFetcher = jest.fn();
jest.mock('../../../hooks/use_fetcher', () => ({
  useFetcher: () => mockUseFetcher(),
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
});
