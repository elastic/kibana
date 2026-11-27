/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { act, render, screen, waitFor } from '@testing-library/react';
import type { History } from 'history';
import { createMemoryHistory } from 'history';
import type { ReactNode } from 'react';
import React from 'react';

import type { CoreStart } from '@kbn/core/public';
import { merge } from 'lodash';
import { EuiThemeProvider } from '@kbn/kibana-react-plugin/common';
import { createKibanaReactContext } from '@kbn/kibana-react-plugin/public';
import { MockUrlParamsContextProvider } from '../../../../context/url_params_context/mock_url_params_context_provider';
import type { ApmPluginContextValue } from '../../../../context/apm_plugin/apm_plugin_context';
import {
  mockApmPluginContextValue,
  MockApmPluginContextWrapper,
} from '../../../../context/apm_plugin/mock_apm_plugin_context';
import * as useFetcherModule from '../../../../hooks/use_fetcher';
import { fromQuery, toQuery } from '../../../shared/links/url_helpers';

import type { UrlParams } from '../../../../context/url_params_context/types';
import { TransactionDistribution } from '.';

interface CapturedWaterfallProps {
  selectedSample?: { traceId: string; transactionId: string } | null;
  selectedSampleIndex?: number;
  traceSamples?: Array<{ traceId: string; transactionId: string }>;
  onSampleClick?: (sample: { traceId: string; transactionId: string }, index: number) => void;
}

const mockWaterfallWithSummarySpy = jest.fn<void, [CapturedWaterfallProps]>();

jest.mock('../waterfall_with_summary', () => ({
  WaterfallWithSummary: (props: CapturedWaterfallProps) => {
    mockWaterfallWithSummarySpy(props);
    return null;
  },
}));

const coreMock = {
  settings: { client: { get: () => {} } },
} as unknown as CoreStart;

function Wrapper({
  children,
  urlParams,
  search,
  onHistory,
}: {
  children?: ReactNode;
  urlParams?: Partial<UrlParams>;
  search?: string;
  onHistory?: (history: ReturnType<typeof createMemoryHistory>) => void;
}) {
  const KibanaReactContext = createKibanaReactContext({
    ...coreMock,
    usageCollection: { reportUiCounter: () => {} },
  } as Partial<CoreStart>);

  const httpGet = jest.fn();

  const history = createMemoryHistory();
  jest.spyOn(history, 'push');
  jest.spyOn(history, 'replace');
  onHistory?.(history);

  history.replace({
    pathname: '/services/the-service-name/transactions/view',
    search: fromQuery({
      // `search` is a bare query string produced by `fromQuery` (no leading
      // `?`), while `toQuery` expects a `location.search` value and strips the
      // first character; prepend `?` so the first key survives the round-trip.
      ...toQuery(search ? `?${search}` : search),
      transactionName: 'the-transaction-name',
      rangeFrom: 'now-15m',
      rangeTo: 'now',
    }),
  });

  const mockPluginContext = merge({}, mockApmPluginContextValue, {
    core: { http: { get: httpGet } },
  }) as unknown as ApmPluginContextValue;

  return (
    <IntlProvider locale="en">
      <EuiThemeProvider darkMode={false}>
        <KibanaReactContext.Provider>
          <MockApmPluginContextWrapper history={history} value={mockPluginContext}>
            <MockUrlParamsContextProvider
              params={{
                rangeFrom: 'now-15m',
                rangeTo: 'now',
                start: 'mystart',
                end: 'myend',
                ...urlParams,
              }}
            >
              {children}
            </MockUrlParamsContextProvider>
          </MockApmPluginContextWrapper>
        </KibanaReactContext.Provider>
      </EuiThemeProvider>
    </IntlProvider>
  );
}

describe('transaction_details/distribution', () => {
  beforeEach(() => {
    mockWaterfallWithSummarySpy.mockClear();
  });

  describe('TransactionDistribution', () => {
    it('shows loading indicator when the service is running and returned no results yet', async () => {
      jest.spyOn(useFetcherModule, 'useFetcher').mockImplementation(() => ({
        data: undefined,
        refetch: () => {},
        status: useFetcherModule.FETCH_STATUS.LOADING,
      }));

      render(
        <TransactionDistribution
          onChartSelection={jest.fn()}
          onClearSelection={jest.fn()}
          traceSamplesFetchResult={{
            data: { traceSamples: [] },
            status: useFetcherModule.FETCH_STATUS.LOADING,
            error: undefined,
          }}
        />,

        { wrapper: Wrapper }
      );

      await waitFor(() => {
        expect(screen.getByTestId('apmCorrelationsChart')).toBeInTheDocument();
        expect(screen.getByTestId('loading')).toBeInTheDocument();
      });
    });

    it("doesn't show loading indicator when the service isn't running", async () => {
      jest
        .spyOn(useFetcherModule, 'useFetcher')
        .mockImplementationOnce(() => ({
          data: {
            traceItems: [],
            entryTransaction: {},
          },
          refetch: () => {},
          status: useFetcherModule.FETCH_STATUS.SUCCESS,
        }))
        .mockImplementationOnce(() => ({
          data: { traceItems: [], errors: [], agentMarks: {} },
          refetch: () => {},
          status: useFetcherModule.FETCH_STATUS.SUCCESS,
        }))
        .mockImplementationOnce(() => ({
          data: { percentileThresholdValue: 1234, overallHistogram: [] },
          refetch: () => {},
          status: useFetcherModule.FETCH_STATUS.SUCCESS,
        }));

      render(
        <Wrapper>
          <TransactionDistribution
            onChartSelection={jest.fn()}
            onClearSelection={jest.fn()}
            traceSamplesFetchResult={{
              data: { traceSamples: [] },
              status: useFetcherModule.FETCH_STATUS.LOADING,
              error: undefined,
            }}
          />
        </Wrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('apmCorrelationsChart')).toBeInTheDocument();
        expect(screen.queryByTestId('loading')).toBeNull(); // it doesn't exist
      });
    });

    describe('trace sample selection', () => {
      const traceSamples = [
        {
          traceId: 'trace-a',
          transactionId: 'tx-a',
          score: null,
          timestamp: '2024-01-01T00:00:00Z',
        },
        {
          traceId: 'trace-b',
          transactionId: 'tx-b',
          score: null,
          timestamp: '2024-01-01T00:00:01Z',
        },
        {
          traceId: 'trace-c',
          transactionId: 'tx-c',
          score: null,
          timestamp: '2024-01-01T00:00:02Z',
        },
      ];

      beforeEach(() => {
        jest.spyOn(useFetcherModule, 'useFetcher').mockImplementation(() => ({
          data: undefined,
          refetch: () => {},
          status: useFetcherModule.FETCH_STATUS.SUCCESS,
        }));
      });

      // Regression test: the pagination index must reflect the trace sample
      // selected via the URL (traceId/transactionId), so it stays in sync when
      // navigating back/forward through browser history.
      it('passes the URL-selected sample to WaterfallWithSummary so the index tracks the URL', async () => {
        render(
          <TransactionDistribution
            onChartSelection={jest.fn()}
            onClearSelection={jest.fn()}
            traceSamplesFetchResult={{
              data: { traceSamples },
              status: useFetcherModule.FETCH_STATUS.SUCCESS,
              error: undefined,
            }}
          />,
          {
            wrapper: ({ children }: { children?: ReactNode }) => (
              <Wrapper urlParams={{ traceId: 'trace-b', transactionId: 'tx-b' }}>
                {children}
              </Wrapper>
            ),
          }
        );

        await waitFor(() => {
          expect(mockWaterfallWithSummarySpy).toHaveBeenCalled();
        });

        const lastProps = mockWaterfallWithSummarySpy.mock.calls.at(-1)?.[0];
        expect(lastProps?.selectedSample).toEqual(traceSamples[1]);
        // The same reference from traceSamples must be passed so indexOf resolves.
        expect(lastProps?.selectedSample).toBe(lastProps?.traceSamples?.[1]);
      });

      it('passes selectedSample as null when the URL sample is not among the samples', async () => {
        render(
          <TransactionDistribution
            onChartSelection={jest.fn()}
            onClearSelection={jest.fn()}
            traceSamplesFetchResult={{
              data: { traceSamples },
              status: useFetcherModule.FETCH_STATUS.SUCCESS,
              error: undefined,
            }}
          />,
          {
            wrapper: ({ children }: { children?: ReactNode }) => (
              <Wrapper urlParams={{ traceId: 'unknown', transactionId: 'unknown' }}>
                {children}
              </Wrapper>
            ),
          }
        );

        await waitFor(() => {
          expect(mockWaterfallWithSummarySpy).toHaveBeenCalled();
        });

        const lastProps = mockWaterfallWithSummarySpy.mock.calls.at(-1)?.[0];
        // Passing `null` (not `undefined`) keeps WaterfallWithSummary in the
        // controlled code path that derives the index from the URL.
        expect(lastProps?.selectedSample).toBeNull();
      });

      // Regression test for #4744: paired documents (e.g. with/without
      // `gen_ai.*` fields) share the same traceId/transactionId. Selecting by
      // identifier alone collapses both onto the first match, so navigation to
      // the second member of the pair must be driven by the URL `sampleIndex`.
      describe('with samples sharing the same traceId/transactionId', () => {
        const pairedTraceSamples = [
          {
            traceId: 'trace-shared',
            transactionId: 'tx-shared',
            score: null,
            timestamp: '2024-01-01T00:00:00Z',
          },
          {
            traceId: 'trace-shared',
            transactionId: 'tx-shared',
            score: null,
            timestamp: '2024-01-01T00:00:01Z',
          },
        ];

        it('resolves the selected sample by URL sampleIndex, not by identifier', async () => {
          render(
            <TransactionDistribution
              onChartSelection={jest.fn()}
              onClearSelection={jest.fn()}
              traceSamplesFetchResult={{
                data: { traceSamples: pairedTraceSamples },
                status: useFetcherModule.FETCH_STATUS.SUCCESS,
                error: undefined,
              }}
            />,
            {
              wrapper: ({ children }: { children?: ReactNode }) => (
                <Wrapper
                  urlParams={{ traceId: 'trace-shared', transactionId: 'tx-shared' }}
                  search={fromQuery({ sampleIndex: 1 })}
                >
                  {children}
                </Wrapper>
              ),
            }
          );

          await waitFor(() => {
            expect(mockWaterfallWithSummarySpy).toHaveBeenCalled();
          });

          const lastProps = mockWaterfallWithSummarySpy.mock.calls.at(-1)?.[0];
          // Without the index the pager would resolve to the first paired sample
          // (index 0); the URL index must point at the second one instead.
          expect(lastProps?.selectedSampleIndex).toBe(1);
          expect(lastProps?.selectedSample).toBe(lastProps?.traceSamples?.[1]);
        });

        it('falls back to identifier matching when no sampleIndex is in the URL', async () => {
          render(
            <TransactionDistribution
              onChartSelection={jest.fn()}
              onClearSelection={jest.fn()}
              traceSamplesFetchResult={{
                data: { traceSamples: pairedTraceSamples },
                status: useFetcherModule.FETCH_STATUS.SUCCESS,
                error: undefined,
              }}
            />,
            {
              wrapper: ({ children }: { children?: ReactNode }) => (
                <Wrapper urlParams={{ traceId: 'trace-shared', transactionId: 'tx-shared' }}>
                  {children}
                </Wrapper>
              ),
            }
          );

          await waitFor(() => {
            expect(mockWaterfallWithSummarySpy).toHaveBeenCalled();
          });

          const lastProps = mockWaterfallWithSummarySpy.mock.calls.at(-1)?.[0];
          expect(lastProps?.selectedSampleIndex).toBeUndefined();
          expect(lastProps?.selectedSample).toBe(lastProps?.traceSamples?.[0]);
        });

        // Interaction regression for #4744: paging onto the second member of a
        // duplicate pair must write `sampleIndex` to the URL and move the active
        // page, and browser-back must step the pager back. Inspecting initial
        // props alone would stay green even if `onSampleClick` stopped
        // forwarding the clicked index, so drive the click and history here.
        it('writes sampleIndex on next and restores it on back for a duplicate pair', async () => {
          let history: History | undefined;

          render(
            <TransactionDistribution
              onChartSelection={jest.fn()}
              onClearSelection={jest.fn()}
              traceSamplesFetchResult={{
                data: { traceSamples: pairedTraceSamples },
                status: useFetcherModule.FETCH_STATUS.SUCCESS,
                error: undefined,
              }}
            />,
            {
              wrapper: ({ children }: { children?: ReactNode }) => (
                <Wrapper
                  urlParams={{ traceId: 'trace-shared', transactionId: 'tx-shared' }}
                  search={fromQuery({ sampleIndex: 0 })}
                  onHistory={(h) => {
                    history = h;
                  }}
                >
                  {children}
                </Wrapper>
              ),
            }
          );

          await waitFor(() => {
            expect(mockWaterfallWithSummarySpy).toHaveBeenCalled();
          });

          // The pager starts on the first member of the pair.
          const initialProps = mockWaterfallWithSummarySpy.mock.calls.at(-1)?.[0];
          expect(initialProps?.selectedSampleIndex).toBe(0);
          expect(initialProps?.selectedSample).toBe(initialProps?.traceSamples?.[0]);

          // Simulate clicking "next" onto the second, identical-id sample. The
          // pager forwards the clicked index via onSampleClick.
          act(() => {
            initialProps?.onSampleClick?.(pairedTraceSamples[1], 1);
          });

          await waitFor(() => {
            const props = mockWaterfallWithSummarySpy.mock.calls.at(-1)?.[0];
            expect(props?.selectedSampleIndex).toBe(1);
          });

          // The URL carries the new position while the shared ids are unchanged.
          expect(toQuery(history?.location.search).sampleIndex).toBe('1');
          const afterNext = mockWaterfallWithSummarySpy.mock.calls.at(-1)?.[0];
          expect(afterNext?.selectedSample).toBe(afterNext?.traceSamples?.[1]);

          // Browser-back steps the pager back to the first member of the pair.
          act(() => {
            history?.goBack();
          });

          await waitFor(() => {
            const props = mockWaterfallWithSummarySpy.mock.calls.at(-1)?.[0];
            expect(props?.selectedSampleIndex).toBe(0);
          });

          expect(toQuery(history?.location.search).sampleIndex).toBe('0');
          const afterBack = mockWaterfallWithSummarySpy.mock.calls.at(-1)?.[0];
          expect(afterBack?.selectedSample).toBe(afterBack?.traceSamples?.[0]);
        });
      });

      // Regression for a stale `sampleIndex`: reloading after paging refetches
      // samples with the URL's ids boosted by `_score`, so the sample that used
      // to live at the old index may now be a different, unrelated one. The
      // index must only be trusted when the sample at that position still
      // matches the URL's traceId/transactionId; otherwise fall back to
      // identifier matching and drop the stale index.
      it('ignores sampleIndex when the sample at that position no longer matches the URL ids', async () => {
        // The URL points at trace-b, but sampleIndex=0 now resolves to trace-a
        // (e.g. trace-b was boosted to the front on a refetch).
        render(
          <TransactionDistribution
            onChartSelection={jest.fn()}
            onClearSelection={jest.fn()}
            traceSamplesFetchResult={{
              data: { traceSamples },
              status: useFetcherModule.FETCH_STATUS.SUCCESS,
              error: undefined,
            }}
          />,
          {
            wrapper: ({ children }: { children?: ReactNode }) => (
              <Wrapper
                urlParams={{ traceId: 'trace-b', transactionId: 'tx-b' }}
                search={fromQuery({ sampleIndex: 0 })}
              >
                {children}
              </Wrapper>
            ),
          }
        );

        await waitFor(() => {
          expect(mockWaterfallWithSummarySpy).toHaveBeenCalled();
        });

        const lastProps = mockWaterfallWithSummarySpy.mock.calls.at(-1)?.[0];
        // The stale index is dropped rather than forwarded to the pager...
        expect(lastProps?.selectedSampleIndex).toBeUndefined();
        // ...and selection falls back to matching the URL ids (trace-b, index 1).
        expect(lastProps?.selectedSample).toBe(lastProps?.traceSamples?.[1]);
      });
    });
  });
});
