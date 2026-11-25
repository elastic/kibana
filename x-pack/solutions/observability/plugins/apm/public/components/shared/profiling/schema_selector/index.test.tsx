/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, render } from '@testing-library/react';
import {
  EmbeddableProfilingSchemaSelector,
  ProfilingSchemaStateProvider,
  useProfilingSchemaState,
} from '@kbn/observability-shared-plugin/public';
import { ProfilingSchema } from '@kbn/profiling-utils';
import { FETCH_STATUS, useFetcher } from '../../../../hooks/use_fetcher';
import { ProfilingSchemaSelectorBase, ProfilingSchemaSelector } from '.';

jest.mock('@kbn/observability-shared-plugin/public', () => ({
  ...jest.requireActual('@kbn/observability-shared-plugin/public'),
  EmbeddableProfilingSchemaSelector: jest.fn(() => null),
}));
jest.mock('../../../../hooks/use_fetcher', () => ({
  ...jest.requireActual('../../../../hooks/use_fetcher'),
  useFetcher: jest.fn(),
}));

const getSelectorProps = () => jest.mocked(EmbeddableProfilingSchemaSelector).mock.lastCall![0];

// Runs the request the selector passes to `useFetcher`
const requestSchemas = () => {
  const callApmApi = jest.fn();
  const [request] = jest.mocked(useFetcher).mock.lastCall!;
  request(callApmApi, new AbortController().signal);
  return callApmApi;
};

describe('ProfilingSchemaSelectorBase', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('offers the given schemas with data', () => {
    const schemasError = new Error('Request failed');

    render(
      <ProfilingSchemaStateProvider>
        <ProfilingSchemaSelectorBase
          schemas={[ProfilingSchema.OTEL]}
          isLoadingSchemas={false}
          schemasError={schemasError}
        />
      </ProfilingSchemaStateProvider>
    );

    expect(getSelectorProps()).toEqual(
      expect.objectContaining({
        schema: undefined,
        schemas: [ProfilingSchema.OTEL],
        isLoadingSchemas: false,
        schemasError,
      })
    );
  });

  it('shares the selected schema with the other components below the provider', () => {
    function SchemaDisplay() {
      return <span data-test-subj="schema">{useProfilingSchemaState().schema}</span>;
    }
    const { getByTestId } = render(
      <ProfilingSchemaStateProvider>
        <ProfilingSchemaSelectorBase isLoadingSchemas={false} />
        <SchemaDisplay />
      </ProfilingSchemaStateProvider>
    );

    act(() => getSelectorProps().onSchemaChange(ProfilingSchema.OTEL));

    expect(getSelectorProps().schema).toBe(ProfilingSchema.OTEL);
    expect(getByTestId('schema')).toHaveTextContent(ProfilingSchema.OTEL);
  });
});

describe('ProfilingSchemaSelector', () => {
  const props = {
    serviceName: 'my-service',
    start: '2023-10-30T00:00:00.000Z',
    end: '2023-10-30T00:15:00.000Z',
    environment: 'production',
    kuery: 'transaction.result : "HTTP 2xx"',
    transactionName: 'GET /orders',
  };

  const renderSelector = (transactionType?: string) =>
    render(
      <ProfilingSchemaStateProvider>
        <ProfilingSchemaSelector {...props} transactionType={transactionType} />
      </ProfilingSchemaStateProvider>
    );

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useFetcher).mockReturnValue({
      data: { schemas: [ProfilingSchema.ECS] },
      status: FETCH_STATUS.SUCCESS,
      refetch: jest.fn(),
    });
  });

  it('checks the schemas with data of the transactions', () => {
    renderSelector('request');

    expect(requestSchemas()).toHaveBeenCalledWith(
      'GET /internal/apm/services/{serviceName}/profiling/schemas',
      {
        params: {
          path: { serviceName: 'my-service' },
          query: {
            start: props.start,
            end: props.end,
            environment: 'production',
            kuery: props.kuery,
            transactionName: 'GET /orders',
            transactionType: 'request',
          },
        },
      }
    );
    expect(getSelectorProps()).toEqual(
      expect.objectContaining({ schemas: [ProfilingSchema.ECS], isLoadingSchemas: false })
    );
  });

  it('waits for the transaction type before checking the schemas with data', () => {
    jest.mocked(useFetcher).mockReturnValue({
      status: FETCH_STATUS.NOT_INITIATED,
      refetch: jest.fn(),
    });

    renderSelector();

    expect(requestSchemas()).not.toHaveBeenCalled();
    expect(getSelectorProps().isLoadingSchemas).toBe(true);
  });
});
