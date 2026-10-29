/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { ProfilingSchema } from '@kbn/profiling-utils';
import { FETCH_STATUS, useFetcher } from '../../../hooks/use_fetcher';
import { ProfilingFlamegraph } from './flamegraph';
import { ProfilingFlamegraphLink } from './flamegraph/flamegraph_link';
import { ProfilingTopNFunctions } from './top_functions';
import { ProfilingTopNFunctionsLink } from './top_functions/top_functions_link';

jest.mock('../../../hooks/use_fetcher', () => ({
  ...jest.requireActual('../../../hooks/use_fetcher'),
  useFetcher: jest.fn(),
}));
jest.mock('../../../hooks/use_time_range', () => ({
  useTimeRange: () => ({ start: '2023-10-30T00:00:00.000Z', end: '2023-10-30T00:15:00.000Z' }),
}));
jest.mock('./flamegraph/flamegraph_link', () => ({ ProfilingFlamegraphLink: jest.fn(() => null) }));
jest.mock('./top_functions/top_functions_link', () => ({
  ProfilingTopNFunctionsLink: jest.fn(() => null),
}));
jest.mock('../charts/flamegraph', () => ({ FlamegraphChart: () => null }));
jest.mock('@kbn/observability-shared-plugin/public', () => ({ EmbeddableFunctions: () => null }));

const props = {
  serviceName: 'opbeans-java',
  rangeFrom: 'now-15m',
  rangeTo: 'now',
  kuery: '',
  transactionType: 'request',
  environment: 'production',
};

// Runs the request the view passes to `useFetcher`
const requestData = () => {
  const callApmApi = jest.fn();
  const [request] = jest.mocked(useFetcher).mock.lastCall!;
  request(callApmApi, new AbortController().signal);
  return callApmApi;
};

describe.each([
  [
    'ProfilingFlamegraph',
    ProfilingFlamegraph,
    'GET /internal/apm/services/{serviceName}/profiling/flamegraph',
    ProfilingFlamegraphLink,
    { TotalSamples: 0 },
    { TotalSamples: 42 },
  ],
  [
    'ProfilingTopNFunctions',
    ProfilingTopNFunctions,
    'GET /internal/apm/services/{serviceName}/profiling/functions',
    ProfilingTopNFunctionsLink,
    { TotalCount: 0 },
    { TotalCount: 5 },
  ],
])('%s', (_name, View, endpoint, Link, emptyData, nonEmptyData) => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useFetcher).mockReturnValue({
      status: FETCH_STATUS.NOT_INITIATED,
      refetch: jest.fn(),
    });
  });

  it('waits for a schema before requesting the profiling data', () => {
    render(<View {...props} />);

    expect(requestData()).not.toHaveBeenCalled();
  });

  it('requests the profiling data of the selected schema', () => {
    render(<View {...props} schema={ProfilingSchema.OTEL} />);

    expect(requestData()).toHaveBeenCalledWith(endpoint, {
      params: expect.objectContaining({
        query: expect.objectContaining({ schema: ProfilingSchema.OTEL }),
      }),
    });
  });

  it('links to the Profiling app with the selected schema', () => {
    render(<View {...props} schema={ProfilingSchema.OTEL} />);

    expect(Link).toHaveBeenCalledWith(
      expect.objectContaining({ schema: ProfilingSchema.OTEL }),
      expect.anything()
    );
  });

  describe('fallback', () => {
    it('renders the fallback when the service has no profiling samples', () => {
      jest.mocked(useFetcher).mockReturnValue({
        data: emptyData as any,
        status: FETCH_STATUS.SUCCESS,
        refetch: jest.fn(),
      });
      const fallback = <div data-test-subj="fallback" />;

      const { queryByTestId } = render(
        <View {...props} schema={ProfilingSchema.OTEL} fallback={fallback} />
      );

      expect(queryByTestId('fallback')).toBeInTheDocument();
    });

    it('does not render the fallback when the service has profiling samples', () => {
      jest.mocked(useFetcher).mockReturnValue({
        data: nonEmptyData as any,
        status: FETCH_STATUS.SUCCESS,
        refetch: jest.fn(),
      });
      const fallback = <div data-test-subj="fallback" />;

      const { queryByTestId } = render(
        <View {...props} schema={ProfilingSchema.OTEL} fallback={fallback} />
      );

      expect(queryByTestId('fallback')).not.toBeInTheDocument();
    });

    it('calls onFallback once when the fallback first renders', () => {
      jest.mocked(useFetcher).mockReturnValue({
        data: emptyData as any,
        status: FETCH_STATUS.SUCCESS,
        refetch: jest.fn(),
      });
      const onFallback = jest.fn();

      render(
        <View {...props} schema={ProfilingSchema.OTEL} fallback={<div />} onFallback={onFallback} />
      );

      expect(onFallback).toHaveBeenCalledTimes(1);
    });

    it('does not call onFallback when still loading', () => {
      jest.mocked(useFetcher).mockReturnValue({
        status: FETCH_STATUS.LOADING,
        refetch: jest.fn(),
      });
      const onFallback = jest.fn();

      render(
        <View {...props} schema={ProfilingSchema.OTEL} fallback={<div />} onFallback={onFallback} />
      );

      expect(onFallback).not.toHaveBeenCalled();
    });
  });
});
