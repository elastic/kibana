/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useServiceMapBadges } from './use_service_map_badges';
import { FETCH_STATUS, useFetcher } from '../../../hooks/use_fetcher';
import { useLicenseContext } from '../../../context/license/use_license_context';
import { useApmPluginContext } from '../../../context/apm_plugin/use_apm_plugin_context';
import { ENVIRONMENT_ALL } from '../../../../common/environment_filter_values';
import type { ServiceMapNode } from '../../../../common/service_map';
import type { ServiceMapBadgesApiResponse } from './merge_service_map_nodes_with_badges';

jest.mock('../../../context/license/use_license_context', () => ({
  useLicenseContext: jest.fn(),
}));

jest.mock('../../../context/apm_plugin/use_apm_plugin_context', () => ({
  useApmPluginContext: jest.fn(),
}));

jest.mock('../../../hooks/use_fetcher', () => ({
  FETCH_STATUS: jest.requireActual('../../../hooks/use_fetcher').FETCH_STATUS,
  useFetcher: jest.fn(),
}));

const mockedUseLicenseContext = jest.mocked(useLicenseContext);
const mockedUseApmPluginContext = jest.mocked(useApmPluginContext);
const mockedUseFetcher = jest.mocked(useFetcher);
const mockedRefetch = jest.fn();

const platinumLicense = { isActive: true, hasAtLeast: () => true };

const serviceNodeA: ServiceMapNode = {
  id: 'service-a',
  position: { x: 0, y: 0 },
  data: { id: 'service-a', label: 'service-a', isService: true as const },
};

const serviceNodeB: ServiceMapNode = {
  id: 'service-b',
  position: { x: 100, y: 0 },
  data: { id: 'service-b', label: 'service-b', isService: true as const },
};

const dependencyNode: ServiceMapNode = {
  id: 'dep-x',
  position: { x: 200, y: 0 },
  data: { id: '>dep-x', label: 'dep-x', isService: false as const },
};

const alertsOnlyResponse: ServiceMapBadgesApiResponse = {
  alerts: [{ serviceName: 'service-a', alertsCount: 3 }],
  slos: [],
};

const slosOnlyResponse: ServiceMapBadgesApiResponse = {
  alerts: [],
  slos: [{ serviceName: 'service-b', sloStatus: 'violated', sloCount: 2 }],
};

const alertsAndSlosResponse: ServiceMapBadgesApiResponse = {
  alerts: [{ serviceName: 'service-a', alertsCount: 2 }],
  slos: [{ serviceName: 'service-a', sloStatus: 'degrading', sloCount: 1 }],
};

const emptyResponse: ServiceMapBadgesApiResponse = {
  alerts: [],
  slos: [],
};

const defaultParams: Parameters<typeof useServiceMapBadges>[0] = {
  nodes: [serviceNodeA, serviceNodeB],
  environment: ENVIRONMENT_ALL.value,
  start: '2026-01-01T00:00:00.000Z',
  end: '2026-01-01T01:00:00.000Z',
  kuery: '',
  nodesStatus: FETCH_STATUS.SUCCESS,
};

describe('useServiceMapBadges()', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockedUseLicenseContext.mockReturnValue(
      platinumLicense as unknown as ReturnType<typeof useLicenseContext>
    );
    mockedUseApmPluginContext.mockReturnValue({
      config: { serviceMapEnabled: true },
    } as ReturnType<typeof useApmPluginContext>);

    mockedUseFetcher.mockReturnValue({
      data: undefined,
      status: FETCH_STATUS.NOT_INITIATED,
      refetch: mockedRefetch,
    });
  });

  describe('returns the original nodes unchanged when badges are disabled', () => {
    it('license is not available', () => {
      mockedUseLicenseContext.mockReturnValue(undefined);

      const { result } = renderHook(() => useServiceMapBadges(defaultParams));

      expect(result.current.nodes).toBe(defaultParams.nodes);
    });

    it('license is not Platinum', () => {
      mockedUseLicenseContext.mockReturnValue({
        isActive: false,
        hasAtLeast: () => false,
      } as unknown as ReturnType<typeof useLicenseContext>);

      const { result } = renderHook(() => useServiceMapBadges(defaultParams));

      expect(result.current.nodes).toBe(defaultParams.nodes);
    });

    it('serviceMapEnabled is false', () => {
      mockedUseApmPluginContext.mockReturnValue({
        config: { serviceMapEnabled: false },
      } as ReturnType<typeof useApmPluginContext>);

      const { result } = renderHook(() => useServiceMapBadges(defaultParams));

      expect(result.current.nodes).toBe(defaultParams.nodes);
    });

    it('nodesStatus is NOT_INITIATED', () => {
      const { result } = renderHook(() =>
        useServiceMapBadges({ ...defaultParams, nodesStatus: FETCH_STATUS.NOT_INITIATED })
      );

      expect(result.current.nodes).toBe(defaultParams.nodes);
    });

    it('nodesStatus is LOADING', () => {
      const { result } = renderHook(() =>
        useServiceMapBadges({ ...defaultParams, nodesStatus: FETCH_STATUS.LOADING })
      );

      expect(result.current.nodes).toBe(defaultParams.nodes);
    });

    it('nodesStatus is FAILURE', () => {
      const { result } = renderHook(() =>
        useServiceMapBadges({ ...defaultParams, nodesStatus: FETCH_STATUS.FAILURE })
      );

      expect(result.current.nodes).toBe(defaultParams.nodes);
    });

    it('nodes array is empty', () => {
      const { result } = renderHook(() => useServiceMapBadges({ ...defaultParams, nodes: [] }));

      expect(result.current.nodes).toEqual([]);
    });
  });

  describe('when badges are enabled but still loading', () => {
    it('returns the original nodes and propagates the LOADING status', () => {
      mockedUseFetcher.mockReturnValue({
        data: undefined,
        status: FETCH_STATUS.LOADING,
        refetch: mockedRefetch,
      });

      const { result } = renderHook(() => useServiceMapBadges(defaultParams));

      expect(result.current.nodes).toBe(defaultParams.nodes);
      expect(result.current.status).toBe(FETCH_STATUS.LOADING);
    });
  });

  describe('when the badge fetch succeeds', () => {
    it('merges alert counts into matching service nodes', () => {
      mockedUseFetcher.mockReturnValue({
        data: alertsOnlyResponse,
        status: FETCH_STATUS.SUCCESS,
        refetch: mockedRefetch,
      });

      const { result } = renderHook(() => useServiceMapBadges(defaultParams));

      const nodeA = result.current.nodes.find((n) => n.id === 'service-a');
      expect(nodeA?.data).toMatchObject({ alertsCount: 3 });
    });

    it('merges SLO status and count into matching service nodes', () => {
      mockedUseFetcher.mockReturnValue({
        data: slosOnlyResponse,
        status: FETCH_STATUS.SUCCESS,
        refetch: mockedRefetch,
      });

      const { result } = renderHook(() => useServiceMapBadges(defaultParams));

      const nodeB = result.current.nodes.find((n) => n.id === 'service-b');
      expect(nodeB?.data).toMatchObject({ sloStatus: 'violated', sloCount: 2 });
    });

    it('merges both alert and SLO data into the same service node when both are present', () => {
      mockedUseFetcher.mockReturnValue({
        data: alertsAndSlosResponse,
        status: FETCH_STATUS.SUCCESS,
        refetch: mockedRefetch,
      });

      const { result } = renderHook(() => useServiceMapBadges(defaultParams));

      const nodeA = result.current.nodes.find((n) => n.id === 'service-a');
      expect(nodeA?.data).toMatchObject({ alertsCount: 2, sloStatus: 'degrading', sloCount: 1 });
    });

    it('does not add badge fields to service nodes with no matching badge data', () => {
      mockedUseFetcher.mockReturnValue({
        data: emptyResponse,
        status: FETCH_STATUS.SUCCESS,
        refetch: mockedRefetch,
      });

      const { result } = renderHook(() => useServiceMapBadges(defaultParams));

      for (const node of result.current.nodes) {
        expect(node.data).not.toHaveProperty('alertsCount');
        expect(node.data).not.toHaveProperty('sloStatus');
        expect(node.data).not.toHaveProperty('sloCount');
      }
    });

    it('does not merge badge data into dependency nodes', () => {
      const responseTargetingDep = {
        alerts: [{ serviceName: 'dep-x', alertsCount: 5 }],
        slos: [],
      } as unknown as ServiceMapBadgesApiResponse;

      mockedUseFetcher.mockReturnValue({
        data: responseTargetingDep,
        status: FETCH_STATUS.SUCCESS,
        refetch: mockedRefetch,
      });

      const { result } = renderHook(() =>
        useServiceMapBadges({ ...defaultParams, nodes: [serviceNodeA, dependencyNode] })
      );

      const dep = result.current.nodes.find((n) => n.id === 'dep-x');
      expect(dep?.data).not.toHaveProperty('alertsCount');
    });

    it('preserves the original data of unmatched service nodes', () => {
      mockedUseFetcher.mockReturnValue({
        data: alertsOnlyResponse,
        status: FETCH_STATUS.SUCCESS,
        refetch: mockedRefetch,
      });

      const { result } = renderHook(() => useServiceMapBadges(defaultParams));

      const nodeB = result.current.nodes.find((n) => n.id === 'service-b');
      expect(nodeB?.data).not.toHaveProperty('alertsCount');
      expect(nodeB?.data).toMatchObject({ id: 'service-b', label: 'service-b' });
    });

    it('reports SUCCESS status', () => {
      mockedUseFetcher.mockReturnValue({
        data: emptyResponse,
        status: FETCH_STATUS.SUCCESS,
        refetch: mockedRefetch,
      });

      const { result } = renderHook(() => useServiceMapBadges(defaultParams));

      expect(result.current.status).toBe(FETCH_STATUS.SUCCESS);
    });
  });

  describe('when the caller passes an empty kuery (badges decoupled from the map filter)', () => {
    function invokeLastFetcherCallback(callApmApi: jest.Mock) {
      const calls = mockedUseFetcher.mock.calls;
      const cb = calls[calls.length - 1][0] as (
        callApmApiArg: unknown,
        signal: AbortSignal
      ) => unknown;
      const signal = new AbortController().signal;
      return cb(callApmApi, signal);
    }

    it('does not forward `kuery` to the badges endpoint', () => {
      const callApmApi = jest.fn();

      renderHook(() => useServiceMapBadges({ ...defaultParams, kuery: '' }));
      invokeLastFetcherCallback(callApmApi);

      expect(callApmApi).toHaveBeenCalledWith(
        'POST /internal/apm/service-map/service_badges',
        expect.anything()
      );
      const [, requestArgs] = callApmApi.mock.calls[0];
      expect(requestArgs.params.query).not.toHaveProperty('kuery');
    });

    it('still forwards `environment` to the badges endpoint', () => {
      const callApmApi = jest.fn();

      renderHook(() =>
        useServiceMapBadges({ ...defaultParams, kuery: '', environment: 'production' })
      );
      invokeLastFetcherCallback(callApmApi);

      const [, requestArgs] = callApmApi.mock.calls[0];
      expect(requestArgs.params.query).toMatchObject({ environment: 'production' });
    });

    it('changing `environment` re-fires the badges fetcher (new fnDeps array)', () => {
      const { rerender } = renderHook(
        (props: Parameters<typeof useServiceMapBadges>[0]) => useServiceMapBadges(props),
        { initialProps: { ...defaultParams, kuery: '', environment: 'production' } }
      );

      const initialDeps = mockedUseFetcher.mock.calls.at(-1)?.[1];

      rerender({ ...defaultParams, kuery: '', environment: 'staging' });

      const nextDeps = mockedUseFetcher.mock.calls.at(-1)?.[1];
      expect(nextDeps).not.toBe(initialDeps);
      expect(nextDeps).toEqual(expect.arrayContaining(['staging']));
    });

    it('changing `kuery` (when caller keeps using it for the topology) still flows through fnDeps', () => {
      const { rerender } = renderHook(
        (props: Parameters<typeof useServiceMapBadges>[0]) => useServiceMapBadges(props),
        { initialProps: { ...defaultParams, kuery: 'service.name: "a"' } }
      );

      const initialDeps = mockedUseFetcher.mock.calls.at(-1)?.[1];

      rerender({ ...defaultParams, kuery: 'service.name: "b"' });

      const nextDeps = mockedUseFetcher.mock.calls.at(-1)?.[1];
      expect(nextDeps).not.toBe(initialDeps);
    });
  });
});
