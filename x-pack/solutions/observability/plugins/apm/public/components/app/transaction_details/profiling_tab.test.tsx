/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { render } from '@testing-library/react';
import { useProfilingSchemaState } from '@kbn/observability-shared-plugin/public';
import { ProfilingSchema } from '@kbn/profiling-utils';
import { ProfilingFlamegraph } from '../../shared/profiling/flamegraph';
import { ProfilingSchemaSelector } from '../../shared/profiling/schema_selector';
import { profilingTab } from './profiling_tab';

jest.mock('../../../hooks/use_apm_params', () => ({
  useAnyOfApmParams: () => ({
    path: { serviceName: 'my-service' },
    query: {
      rangeFrom: 'now-15m',
      rangeTo: 'now',
      environment: 'production',
      kuery: 'transaction.result : "HTTP 2xx"',
      transactionName: 'GET /orders',
      transactionType: 'request',
    },
  }),
}));
jest.mock('../../../hooks/use_profiling_plugin', () => ({
  useProfilingPlugin: () => ({ isProfilingAvailable: true, isLoading: false }),
}));
jest.mock('../../../hooks/use_time_range', () => ({
  useTimeRange: () => ({ start: '2023-10-30T00:00:00.000Z', end: '2023-10-30T00:15:00.000Z' }),
}));
// Selects OTel, like the selector embeddable selects a default schema
jest.mock('../../shared/profiling/schema_selector', () => ({
  ProfilingSchemaSelector: jest.fn(() => {
    const { setSchema } = useProfilingSchemaState();
    useEffect(() => setSchema(ProfilingSchema.OTEL), [setSchema]);
    return null;
  }),
}));
jest.mock('../../shared/profiling/flamegraph', () => ({
  ProfilingFlamegraph: jest.fn(() => null),
}));
jest.mock('../../shared/profiling/top_functions', () => ({ ProfilingTopNFunctions: () => null }));

const ProfilingTab = profilingTab.component;

describe('Transaction profiling tab', () => {
  it('checks the schemas with data of the transactions', () => {
    render(<ProfilingTab />);

    expect(ProfilingSchemaSelector).toHaveBeenCalledWith(
      expect.objectContaining({
        serviceName: 'my-service',
        environment: 'production',
        kuery: 'transaction.result : "HTTP 2xx"',
        transactionName: 'GET /orders',
        transactionType: 'request',
      }),
      expect.anything()
    );
  });

  it('shows the profiling data of the selected schema', () => {
    render(<ProfilingTab />);

    expect(ProfilingFlamegraph).toHaveBeenLastCalledWith(
      expect.objectContaining({ schema: ProfilingSchema.OTEL }),
      expect.anything()
    );
  });
});
