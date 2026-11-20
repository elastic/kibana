/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { ProfilingSchema } from '@kbn/profiling-utils';
import { useApmServiceContext } from '../../../context/apm_service/use_apm_service_context';
import { useProfilingPlugin } from '../../../hooks/use_profiling_plugin';
import { ProfilingCpsCallout } from '../../shared/profiling/cps_callout';
import { ProfilingFlamegraph } from '../../shared/profiling/flamegraph';
import { ProfilingSchemaSelector } from '../../shared/profiling/schema_selector';
import { ProfilingHostsFlamegraph } from './profiling_hosts_flamegraph';
import { ProfilingHostsSchemaSelector } from './profiling_hosts_schema_selector';
import { ProfilingOverview } from '.';

const KUERY = 'process.thread.name : "main"';

jest.mock('@kbn/observability-shared-plugin/public', () => ({
  ProfilingEmptyState: () => null,
  useProfilingSchemaState: () => ({ schema: 'otel', setSchema: jest.fn() }),
}));
jest.mock('../../../hooks/use_apm_params', () => ({
  useApmParams: () => ({
    path: { serviceName: 'my-service' },
    query: { rangeFrom: 'now-15m', rangeTo: 'now', environment: 'production', kuery: KUERY },
  }),
}));
jest.mock('../../../hooks/use_profiling_plugin', () => ({
  useProfilingPlugin: jest.fn(),
}));
jest.mock('../../../hooks/use_time_range', () => ({
  useTimeRange: () => ({ start: '2023-10-30T00:00:00.000Z', end: '2023-10-30T00:15:00.000Z' }),
}));
jest.mock('../../../hooks/use_preferred_data_source_and_bucket_size', () => ({
  usePreferredDataSourceAndBucketSize: () => undefined,
}));
jest.mock('../../../context/apm_service/use_apm_service_context', () => ({
  useApmServiceContext: jest.fn(),
}));
jest.mock('../../shared/profiling/schema_selector', () => ({
  ProfilingSchemaSelector: jest.fn(() => null),
}));
jest.mock('./profiling_hosts_schema_selector', () => ({
  ProfilingHostsSchemaSelector: jest.fn(() => null),
}));
jest.mock('../../shared/profiling/flamegraph', () => ({
  ProfilingFlamegraph: jest.fn(() => null),
}));
jest.mock('../../shared/profiling/top_functions', () => ({ ProfilingTopNFunctions: () => null }));
jest.mock('./profiling_hosts_flamegraph', () => ({
  ProfilingHostsFlamegraph: jest.fn(() => null),
}));
jest.mock('./profiling_hosts_top_functions', () => ({ ProfilingHostsTopNFunctions: () => null }));
jest.mock('./profiling_hosts_callout', () => ({ ProfilingHostsCallout: () => null }));
jest.mock('../../shared/profiling/cps_callout', () => ({
  ProfilingCpsCallout: jest.fn(() => null),
}));

const mockAgent = (agentName: string) =>
  jest.mocked(useApmServiceContext).mockReturnValue({
    agentName,
    transactionType: 'request',
  } as ReturnType<typeof useApmServiceContext>);

const mockProfilingPlugin = ({
  isProfilingAvailable,
  isLoading,
}: {
  isProfilingAvailable: boolean;
  isLoading: boolean;
}) =>
  jest.mocked(useProfilingPlugin).mockReturnValue({
    isProfilingAvailable,
    isLoading,
  } as ReturnType<typeof useProfilingPlugin>);

describe('ProfilingOverview', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockProfilingPlugin({ isProfilingAvailable: true, isLoading: false });
  });

  describe('CPS callout', () => {
    beforeEach(() => {
      mockAgent('nodejs');
    });

    it('is rendered when profiling has data', () => {
      render(<ProfilingOverview />);

      expect(ProfilingCpsCallout).toHaveBeenCalled();
    });

    it('is rendered when profiling has no data', () => {
      mockProfilingPlugin({ isProfilingAvailable: false, isLoading: false });

      render(<ProfilingOverview />);

      expect(ProfilingCpsCallout).toHaveBeenCalled();
    });

    it('is not rendered while the profiling status loads', () => {
      mockProfilingPlugin({ isProfilingAvailable: false, isLoading: true });

      render(<ProfilingOverview />);

      expect(ProfilingCpsCallout).not.toHaveBeenCalled();
    });
  });

  it('checks the schemas with data of the hosts of the service in the hosts views', () => {
    mockAgent('nodejs');

    render(<ProfilingOverview />);

    expect(ProfilingHostsSchemaSelector).toHaveBeenCalledWith(
      expect.objectContaining({
        serviceName: 'my-service',
        environment: 'production',
        kuery: KUERY,
      }),
      expect.anything()
    );
    expect(ProfilingSchemaSelector).not.toHaveBeenCalled();
    expect(ProfilingHostsFlamegraph).toHaveBeenCalledWith(
      expect.objectContaining({ schema: ProfilingSchema.OTEL }),
      expect.anything()
    );
  });

  it('checks the schemas with data of the transactions of the service in the Java views', () => {
    mockAgent('java');

    render(<ProfilingOverview />);

    expect(ProfilingSchemaSelector).toHaveBeenCalledWith(
      expect.objectContaining({
        serviceName: 'my-service',
        environment: 'production',
        kuery: KUERY,
        transactionType: 'request',
      }),
      expect.anything()
    );
    expect(ProfilingHostsSchemaSelector).not.toHaveBeenCalled();
    expect(ProfilingFlamegraph).toHaveBeenCalledWith(
      expect.objectContaining({ schema: ProfilingSchema.OTEL }),
      expect.anything()
    );
  });
});
