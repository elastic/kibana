/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { PropsWithChildren } from 'react';
import { merge } from 'lodash';
import { createMemoryHistory } from 'history';

import { act, waitFor, renderHook } from '@testing-library/react';

import { ApmPluginContextValue } from '../../../context/apm_plugin/apm_plugin_context';
import {
  mockApmPluginContextValue,
  MockApmPluginContextWrapper,
} from '../../../context/apm_plugin/mock_apm_plugin_context';
import { delay } from '../../../utils/test_helpers';

import { fromQuery } from '../../shared/links/url_helpers';

import { useLatencyCorrelations } from './use_latency_correlations';
import type { APIEndpoint } from '../../../../server';

function wrapper({ children, error = false }: PropsWithChildren<{ error?: boolean }>) {
  const getHttpMethodMock = (method: 'GET' | 'POST') =>
    jest.fn().mockImplementation(async (pathname) => {
      await delay(100);
      if (error) {
        throw new Error('Something went wrong');
      }
      const endpoint = `${method} ${pathname}` as APIEndpoint;
      switch (endpoint) {
        case 'POST /internal/apm/latency/overall_distribution/transactions':
          return {
            overallHistogram: [{ key: 'the-key', doc_count: 1234 }],
            percentileThresholdValue: 1.234,
          };
        case 'GET /internal/apm/correlations/field_candidates/transactions':
          return { fieldCandidates: ['field-1', 'field2'] };
        case 'POST /internal/apm/correlations/field_value_pairs/transactions':
          return {
            fieldValuePairs: [{ fieldName: 'field-name-1', fieldValue: 'field-value-1' }],
          };
        case 'POST /internal/apm/correlations/significant_correlations/transactions':
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
    core: {
      http: { get: getHttpMethodMock('GET'), post: getHttpMethodMock('POST') },
    },
  }) as unknown as ApmPluginContextValue;

  return (
    <MockApmPluginContextWrapper history={history} value={mockPluginContext}>
      {children}
    </MockApmPluginContextWrapper>
  );
}

describe('useLatencyCorrelations', () => {
  describe('when successfully loading results', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should automatically start fetching results', async () => {
      const { result, unmount } = renderHook(useLatencyCorrelations, {
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
      const { result, unmount } = renderHook(useLatencyCorrelations, {
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
      const { result, unmount } = renderHook(useLatencyCorrelations, {
        wrapper,
      });

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
          isRunning: false,
          loaded: 1,
        });

        expect(result.current.response).toEqual({
          ccsWarning: false,
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
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should automatically start fetching results', async () => {
      const { result, unmount } = renderHook(useLatencyCorrelations, {
        wrapper: ({ children }) => wrapper({ children, error: true }),
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
      const { result, unmount } = renderHook(useLatencyCorrelations, {
        wrapper: ({ children }) => wrapper({ children, error: true }),
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
      const { result, unmount } = renderHook(useLatencyCorrelations, {
        wrapper: ({ children }) => wrapper({ children, error: true }),
      });

      try {
        act(() => {
          jest.advanceTimersByTime(150);
        });
        await waitFor(() =>
          expect(result.current.progress).toEqual({
            error: 'Something went wrong',
            isRunning: false,
            loaded: 0,
          })
        );
      } finally {
        unmount();
      }
    });
  });

  describe('when canceled', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should stop running', async () => {
      const { result, unmount } = renderHook(useLatencyCorrelations, {
        wrapper,
      });

      try {
        jest.advanceTimersByTime(150);
        await waitFor(() => expect(result.current.progress.loaded).toBe(0.05));

        expect(result.current.progress.isRunning).toBe(true);

        act(() => {
          result.current.cancelFetch();
        });

        await waitFor(() => expect(result.current.progress.isRunning).toEqual(false));
      } finally {
        unmount();
      }
    });
  });
});
