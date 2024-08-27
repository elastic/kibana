/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetupMock } from '@kbn/core-http-browser-mocks';
import { coreMock } from '@kbn/core/public/mocks';
import { renderHook, act } from '@testing-library/react';
import { attackDiscoveryStatus, usePollApi } from './use_poll_api';
import moment from 'moment/moment';
import { kibanaMock } from '../../common/mock';

const http: HttpSetupMock = coreMock.createSetup().http;
const setApproximateFutureTime = jest.fn();
const defaultProps = { http, setApproximateFutureTime, connectorId: 'my-gpt4o-ai' };

const mockResponse = {
  timestamp: '2024-06-07T18:56:17.357Z',
  createdAt: '2024-06-07T18:56:17.357Z',
  users: [
    {
      id: 'u_mGBROF_q5bmFCATbLXAcCwKa0k8JvONAwSruelyKA5E_0',
      name: 'elastic',
    },
  ],
  status: 'succeeded',
  apiConfig: {
    actionTypeId: '.gen-ai',
    connectorId: 'my-gpt4o-ai',
  },
  attackDiscoveries: [
    {
      summaryMarkdown:
        'A critical malware incident involving {{ host.name c1f9889f-1f6b-4abc-8e65-02de89fe1054 }} and {{ user.name 71ca47cf-082e-4d35-a8e7-6e4fa4e175da }} has been detected. The malware, identified as AppPool.vbs, was executed with high privileges and attempted to evade detection.',
      id: '2204421f-bb42-4b96-a200-016a5388a029',
      title: 'Critical Malware Incident on Windows Host',
      mitreAttackTactics: ['Initial Access', 'Execution', 'Defense Evasion'],
      alertIds: [
        '43cf228ce034aeeb89a1ef41cd7fcdef1a3db574fa5237badf1fa9eaa3425c21',
        '44ae9696784b3baeee75935f889e55ce77da338241230b5c488f90a8bace43e2',
        '2479b1b1007952d3b6dc26344c89f44c1bb396de56f1655eca408135b3d05af8',
      ],
      detailsMarkdown: 'details',
      entitySummaryMarkdown:
        '{{ host.name c1f9889f-1f6b-4abc-8e65-02de89fe1054 }} and {{ user.name 71ca47cf-082e-4d35-a8e7-6e4fa4e175da }} are involved in a critical malware incident.',
      timestamp: '2024-06-07T20:04:35.715Z',
    },
  ],
  backingIndex: '1234',
  lastViewedAt: '2024-06-07T20:04:35.715Z',
  updatedAt: '2024-06-07T20:04:35.715Z',
  replacements: {
    'c1f9889f-1f6b-4abc-8e65-02de89fe1054': 'root',
    '71ca47cf-082e-4d35-a8e7-6e4fa4e175da': 'james',
  },
  namespace: 'default',
  generationIntervals: [
    {
      date: '2024-06-07T20:04:35.715Z',
      durationMs: 104593,
    },
    {
      date: '2024-06-07T18:58:27.880Z',
      durationMs: 130526,
    },
  ],
  alertsContextCount: 20,
  averageIntervalMs: 117559,
  id: '8e215edc-6318-4760-9566-d32f1844f9cb',
};

const mockStats = [
  {
    hasViewed: false,
    status: 'failed',
    count: 0,
    connectorId: 'my-bedrock-old',
  },
  {
    hasViewed: false,
    status: 'running',
    count: 1,
    connectorId: 'my-gen-ai',
  },
  {
    hasViewed: true,
    status: 'succeeded',
    count: 1,
    connectorId: 'my-gpt4o-ai',
  },
  {
    hasViewed: true,
    status: 'canceled',
    count: 1,
    connectorId: 'my-bedrock',
  },
  {
    hasViewed: false,
    status: 'succeeded',
    count: 4,
    connectorId: 'my-gen-a2i',
  },
];

describe('usePollApi', () => {
  beforeAll(() => {
    jest.useFakeTimers({ legacyFakeTimers: true });
  });

  afterAll(() => {
    jest.useRealTimers();
  });
  beforeEach(() => {
    jest.clearAllMocks();
  });
  test('should render initial state with null status and data', () => {
    const { result } = renderHook(() => usePollApi(defaultProps));
    expect(result.current.status).toBeNull();
    expect(result.current.data).toBeNull();
  });

  test('should call http.fetch on pollApi call', async () => {
    const { result } = renderHook(() => usePollApi(defaultProps));

    await result.current.pollApi();

    expect(http.fetch).toHaveBeenCalledTimes(1);
    expect(http.fetch).toHaveBeenCalledWith(
      '/internal/elastic_assistant/attack_discovery/my-gpt4o-ai',
      { method: 'GET', version: '1' }
    );
  });

  test('should update didInitialFetch on connector change', async () => {
    http.fetch.mockResolvedValue({
      data: mockResponse,
      stats: mockStats,
    });
    const { result, rerender } = renderHook((props) => usePollApi(props), {
      initialProps: defaultProps,
    });

    expect(result.current.didInitialFetch).toEqual(false);

    await act(async () => {
      await result.current.pollApi();
    });

    expect(result.current.didInitialFetch).toEqual(true);

    rerender({ ...defaultProps, connectorId: 'new-connector-id' });

    expect(result.current.didInitialFetch).toEqual(false);

    await act(async () => {
      await result.current.pollApi();
    });

    expect(result.current.didInitialFetch).toEqual(true);
  });

  test('should update stats, status, and data on successful response', async () => {
    http.fetch.mockResolvedValue({
      data: mockResponse,
      stats: mockStats,
    });
    const { result } = renderHook(() => usePollApi(defaultProps));

    await act(async () => {
      await result.current.pollApi();
    });

    expect(result.current.status).toBe(attackDiscoveryStatus.succeeded);
    expect(result.current.data).toEqual({ ...mockResponse, connectorId: defaultProps.connectorId });
    expect(setApproximateFutureTime).toHaveBeenCalledWith(
      moment(mockResponse.updatedAt).add(mockResponse.averageIntervalMs, 'milliseconds').toDate()
    );
    expect(result.current.stats).toEqual({
      newConnectorResultsCount: 2,
      newDiscoveriesCount: 4,
      statsPerConnector: mockStats,
    });
  });

  test('When no connectorId and pollApi is called, should update status and data to null on error and show toast', async () => {
    const addDangerMock = jest.spyOn(kibanaMock.notifications.toasts, 'addDanger');
    const { result } = renderHook(() =>
      usePollApi({
        http,
        setApproximateFutureTime: () => {},
        toasts: kibanaMock.notifications.toasts,
      })
    );

    await result.current.pollApi();

    expect(result.current.status).toBeNull();
    expect(result.current.data).toBeNull();
    expect(addDangerMock).toHaveBeenCalledTimes(1);
    expect(addDangerMock).toHaveBeenCalledWith(new Error('Invalid connector id'), {
      text: 'Invalid connector id',
      title: 'Error generating attack discoveries',
    });
  });
});
