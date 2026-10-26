/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { ProfilingSchema } from '@kbn/profiling-utils';
import type { ApmDataSourceWithSummary } from '../../../../common/data_source';
import { ApmDocumentType } from '../../../../common/document_type';
import { RollupInterval } from '../../../../common/rollup';
import { FETCH_STATUS, useFetcher } from '../../../hooks/use_fetcher';
import { ProfilingFlamegraphLink } from '../../shared/profiling/flamegraph/flamegraph_link';
import { ProfilingTopNFunctionsLink } from '../../shared/profiling/top_functions/top_functions_link';
import { ProfilingHostsFlamegraph } from './profiling_hosts_flamegraph';
import { ProfilingHostsTopNFunctions } from './profiling_hosts_top_functions';

jest.mock('../../../hooks/use_fetcher', () => ({
  ...jest.requireActual('../../../hooks/use_fetcher'),
  useFetcher: jest.fn(),
}));
jest.mock('../../shared/profiling/flamegraph/flamegraph_link', () => ({
  ProfilingFlamegraphLink: jest.fn(() => null),
}));
jest.mock('../../shared/profiling/top_functions/top_functions_link', () => ({
  ProfilingTopNFunctionsLink: jest.fn(() => null),
}));
jest.mock('../../shared/charts/flamegraph', () => ({ FlamegraphChart: () => null }));
jest.mock('@kbn/observability-shared-plugin/public', () => ({ EmbeddableFunctions: () => null }));
jest.mock('./filter_warning', () => ({ FilterWarning: () => null }));

const props = {
  serviceName: 'opbeans-node',
  start: '2023-10-30T00:00:00.000Z',
  end: '2023-10-30T00:15:00.000Z',
  environment: 'production',
  dataSource: {
    documentType: ApmDocumentType.TransactionMetric,
    rollupInterval: RollupInterval.OneMinute,
    hasDocs: true,
    hasDurationSummaryField: true,
  } as ApmDataSourceWithSummary<ApmDocumentType.TransactionMetric>,
  kuery: '',
  rangeFrom: 'now-15m',
  rangeTo: 'now',
  startIndex: 0,
  endIndex: 10,
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
    'ProfilingHostsFlamegraph',
    ProfilingHostsFlamegraph,
    'GET /internal/apm/services/{serviceName}/profiling/hosts/flamegraph',
    ProfilingFlamegraphLink,
  ],
  [
    'ProfilingHostsTopNFunctions',
    ProfilingHostsTopNFunctions,
    'GET /internal/apm/services/{serviceName}/profiling/hosts/functions',
    ProfilingTopNFunctionsLink,
  ],
])('%s', (_name, View, endpoint, Link) => {
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
});
