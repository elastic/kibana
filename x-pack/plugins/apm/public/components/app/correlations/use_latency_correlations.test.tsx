/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ReactNode } from 'react';
import { merge } from 'lodash';
import { createMemoryHistory } from 'history';
import { renderHook, act } from '@testing-library/react-hooks';

import { ApmPluginContextValue } from '../../../context/apm_plugin/apm_plugin_context';
import {
  mockApmPluginContextValue,
  MockApmPluginContextWrapper,
} from '../../../context/apm_plugin/mock_apm_plugin_context';
import { delay } from '../../../utils/testHelpers';

import { fromQuery } from '../../shared/Links/url_helpers';

import { useLatencyCorrelations } from './use_latency_correlations';

function wrapper({
  children,
  error = false,
}: {
  children?: ReactNode;
  error: boolean;
}) {
  const httpMethodMock = jest.fn().mockImplementation(async (endpoint) => {
    await delay(100);
    if (error) {
      throw new Error('Something went wrong');
    }
    switch (endpoint) {
      case '/internal/apm/latency/overall_distribution':
        return {
          overallHistogram: [{ key: 'the-key', doc_count: 1234 }],
          percentileThresholdValue: 1.234,
        };
      case '/internal/apm/correlations/field_candidates':
        return { fieldCandidates: ['field-1', 'field2'] };
      case '/internal/apm/correlations/field_value_pairs':
        return {
          fieldValuePairs: [
            { fieldName: 'field-name-1', fieldValue: 'field-value-1' },
          ],
        };
      case '/internal/apm/correlations/significant_correlations':
        return {
          latencyCorrelations: [
            {
              fieldName: 'field-name-1',
              fieldValue: 'field-value-1',
              correlation: 0.5,
              histogram: [{ key: 'the-key', doc_count: 123 }],
              ksTest: 0.001,
            },
          ],
        };
      case '/internal/apm/correlations/field_stats':
        return {
          stats: [
            { fieldName: 'field-name-1', count: 123 },
            { fieldName: 'field-name-2', count: 1111 },
          ],
        };
      default:
        return {};
    }
  });

  const history = createMemoryHistory();
  jest.spyOn(history, 'push');
  jest.spyOn(history, 'replace');

  history.replace({
    pathname: '/services/the-service-name/transactions/view',
    search: fromQuery({
      transactionName: 'the-transaction-name',
      rangeFrom: 'now-15m',
      rangeTo: 'now',
    }),
  });

  const mockPluginContext = merge({}, mockApmPluginContextValue, {
    core: { http: { get: httpMethodMock, post: httpMethodMock } },
  }) as unknown as ApmPluginContextValue;

  return (
    <MockApmPluginContextWrapper history={history} value={mockPluginContext}>
      {children}
    </MockApmPluginContextWrapper>
  );
}

describe('useLatencyCorrelations', () => {
  beforeEach(async () => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  describe('when successfully loading results', () => {
    it('should automatically start fetching results', async () => {
      const { result, unmount } = renderHook(() => useLatencyCorrelations(), {
        wrapper,
      });

      try {
        expect(result.current.progress).toEqual({
          isRunning: true,
          loaded: 0,
        });
        expect(result.current.response).toEqual({ ccsWarning: false });
        expect(typeof result.current.startFetch).toEqual('function');
        expect(typeof result.current.cancelFetch).toEqual('function');
      } finally {
        unmount();
      }
    });

    it('should not have received any results after 50ms', async () => {
      const { result, unmount } = renderHook(() => useLatencyCorrelations(), {
        wrapper,
      });

      try {
        jest.advanceTimersByTime(50);

        expect(result.current.progress).toEqual({
          isRunning: true,
          loaded: 0,
        });
        expect(result.current.response).toEqual({ ccsWarning: false });
      } finally {
        unmount();
      }
    });

    it('should receive partial updates and finish running', async () => {
      const { result, unmount, waitFor } = renderHook(
        () => useLatencyCorrelations(),
        {
          wrapper,
        }
      );

      try {
        jest.advanceTimersByTime(150);
        await waitFor(() => expect(result.current.progress.loaded).toBe(0.05));

        expect(result.current.progress).toEqual({
          error: undefined,
          isRunning: true,
          loaded: 0.05,
        });
        expect(result.current.response).toEqual({
          ccsWarning: false,
          fieldStats: undefined,
          latencyCorrelations: undefined,
          overallHistogram: [
            {
              doc_count: 1234,
              key: 'the-key',
            },
          ],
          percentileThresholdValue: 1.234,
        });

        jest.advanceTimersByTime(100);
        await waitFor(() => expect(result.current.progress.loaded).toBe(0.1));

        // field candidates are an implementation detail and
        // will not be exposed, it will just set loaded to 0.1.
        expect(result.current.progress).toEqual({
          error: undefined,
          isRunning: true,
          loaded: 0.1,
        });

        jest.advanceTimersByTime(100);
        await waitFor(() => expect(result.current.progress.loaded).toBe(0.4));

        // field value pairs are an implementation detail and
        // will not be exposed, it will just set loaded to 0.4.
        expect(result.current.progress).toEqual({
          error: undefined,
          isRunning: true,
          loaded: 0.4,
        });

        jest.advanceTimersByTime(100);
        await waitFor(() => expect(result.current.progress.loaded).toBe(1));

        expect(result.current.progress).toEqual({
          error: undefined,
          isRunning: true,
          loaded: 1,
        });

        expect(result.current.response).toEqual({
          ccsWarning: false,
          fieldStats: undefined,
          latencyCorrelations: [
            {
              fieldName: 'field-name-1',
              fieldValue: 'field-value-1',
              correlation: 0.5,
              histogram: [{ key: 'the-key', doc_count: 123 }],
              ksTest: 0.001,
            },
          ],
          overallHistogram: [
            {
              doc_count: 1234,
              key: 'the-key',
            },
          ],
          percentileThresholdValue: 1.234,
        });

        jest.advanceTimersByTime(100);
        await waitFor(() =>
          expect(result.current.response.fieldStats).toBeDefined()
        );

        expect(result.current.progress).toEqual({
          error: undefined,
          isRunning: false,
          loaded: 1,
        });

        expect(result.current.response).toEqual({
          ccsWarning: false,
          fieldStats: [
            { fieldName: 'field-name-1', count: 123 },
            { fieldName: 'field-name-2', count: 1111 },
          ],
          latencyCorrelations: [
            {
              fieldName: 'field-name-1',
              fieldValue: 'field-value-1',
              correlation: 0.5,
              histogram: [{ key: 'the-key', doc_count: 123 }],
              ksTest: 0.001,
            },
          ],
          overallHistogram: [
            {
              doc_count: 1234,
              key: 'the-key',
            },
          ],
          percentileThresholdValue: 1.234,
        });
      } finally {
        unmount();
      }
    });
  });

  describe('when throwing an error', () => {
    it('should automatically start fetching results', async () => {
      const { result, unmount } = renderHook(() => useLatencyCorrelations(), {
        wrapper,
        initialProps: {
          error: true,
        },
      });

      try {
        expect(result.current.progress).toEqual({
          isRunning: true,
          loaded: 0,
        });
      } finally {
        unmount();
      }
    });

    it('should still be running after 50ms', async () => {
      const { result, unmount } = renderHook(() => useLatencyCorrelations(), {
        wrapper,
        initialProps: {
          error: true,
        },
      });

      try {
        jest.advanceTimersByTime(50);

        expect(result.current.progress).toEqual({
          isRunning: true,
          loaded: 0,
        });
        expect(result.current.response).toEqual({ ccsWarning: false });
      } finally {
        unmount();
      }
    });

    it('should stop and return an error after more than 100ms', async () => {
      const { result, unmount, waitFor } = renderHook(
        () => useLatencyCorrelations(),
        {
          wrapper,
          initialProps: {
            error: true,
          },
        }
      );

      try {
        jest.advanceTimersByTime(150);
        await waitFor(() =>
          expect(result.current.progress.error).toBeDefined()
        );

        expect(result.current.progress).toEqual({
          error: 'Something went wrong',
          isRunning: false,
          loaded: 0,
        });
      } finally {
        unmount();
      }
    });
  });

  describe('when canceled', () => {
    it('should stop running', async () => {
      const { result, unmount, waitFor } = renderHook(
        () => useLatencyCorrelations(),
        {
          wrapper,
        }
      );

      try {
        jest.advanceTimersByTime(150);
        await waitFor(() => expect(result.current.progress.loaded).toBe(0.05));

        expect(result.current.progress.isRunning).toBe(true);

        act(() => {
          result.current.cancelFetch();
        });

        await waitFor(() =>
          expect(result.current.progress.isRunning).toEqual(false)
        );
      } finally {
        unmount();
      }
    });
  });
});
