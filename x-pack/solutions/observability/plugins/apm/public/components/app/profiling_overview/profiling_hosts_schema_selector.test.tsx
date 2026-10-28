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
import { ProfilingSchemaSelectorBase } from '../../shared/profiling/schema_selector';
import { ProfilingHostsSchemaSelector } from './profiling_hosts_schema_selector';

jest.mock('../../../hooks/use_fetcher', () => ({
  ...jest.requireActual('../../../hooks/use_fetcher'),
  useFetcher: jest.fn(),
}));
jest.mock('../../shared/profiling/schema_selector', () => ({
  ProfilingSchemaSelectorBase: jest.fn(() => null),
}));

const dataSource = {
  documentType: ApmDocumentType.TransactionMetric,
  rollupInterval: RollupInterval.OneMinute,
  hasDocs: true,
  hasDurationSummaryField: true,
} as ApmDataSourceWithSummary<ApmDocumentType.TransactionMetric>;

const props = {
  serviceName: 'my-service',
  start: '2023-10-30T00:00:00.000Z',
  end: '2023-10-30T00:15:00.000Z',
  environment: 'production',
  kuery: 'process.thread.name : "main"',
};

// Runs the request the selector passes to `useFetcher`
const requestSchemas = () => {
  const callApmApi = jest.fn();
  const [request] = jest.mocked(useFetcher).mock.lastCall!;
  request(callApmApi, new AbortController().signal);
  return callApmApi;
};

describe('ProfilingHostsSchemaSelector', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useFetcher).mockReturnValue({
      data: { schemas: [ProfilingSchema.OTEL] },
      status: FETCH_STATUS.SUCCESS,
      refetch: jest.fn(),
    });
  });

  it('checks the schemas with data of the hosts of the service', () => {
    render(<ProfilingHostsSchemaSelector {...props} dataSource={dataSource} />);

    expect(requestSchemas()).toHaveBeenCalledWith(
      'GET /internal/apm/services/{serviceName}/profiling/hosts/schemas',
      {
        params: {
          path: { serviceName: 'my-service' },
          query: {
            start: props.start,
            end: props.end,
            environment: 'production',
            documentType: ApmDocumentType.TransactionMetric,
            rollupInterval: RollupInterval.OneMinute,
            kuery: props.kuery,
          },
        },
      }
    );
    expect(ProfilingSchemaSelectorBase).toHaveBeenCalledWith(
      expect.objectContaining({ schemas: [ProfilingSchema.OTEL], isLoadingSchemas: false }),
      expect.anything()
    );
  });

  it('waits for the data source before checking the schemas with data', () => {
    jest.mocked(useFetcher).mockReturnValue({
      status: FETCH_STATUS.NOT_INITIATED,
      refetch: jest.fn(),
    });

    render(<ProfilingHostsSchemaSelector {...props} />);

    expect(requestSchemas()).not.toHaveBeenCalled();
    expect(ProfilingSchemaSelectorBase).toHaveBeenCalledWith(
      expect.objectContaining({ isLoadingSchemas: true }),
      expect.anything()
    );
  });
});
