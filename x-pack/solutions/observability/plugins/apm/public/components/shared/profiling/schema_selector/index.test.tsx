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
import { ProfilingSchemaSelector } from '.';

jest.mock('@kbn/observability-shared-plugin/public', () => ({
  ...jest.requireActual('@kbn/observability-shared-plugin/public'),
  EmbeddableProfilingSchemaSelector: jest.fn(() => null),
}));

const getSelectorProps = () => jest.mocked(EmbeddableProfilingSchemaSelector).mock.lastCall![0];

describe('ProfilingSchemaSelector', () => {
  it('checks the schemas with data for the time range in milliseconds and the query', () => {
    render(
      <ProfilingSchemaStateProvider>
        <ProfilingSchemaSelector
          start="2023-10-30T00:00:00.000Z"
          end="2023-10-30T00:15:00.000Z"
          kuery='host.name : "host-1"'
        />
      </ProfilingSchemaStateProvider>
    );

    expect(getSelectorProps()).toEqual(
      expect.objectContaining({
        rangeFrom: new Date('2023-10-30T00:00:00.000Z').valueOf(),
        rangeTo: new Date('2023-10-30T00:15:00.000Z').valueOf(),
        kuery: 'host.name : "host-1"',
        schema: undefined,
      })
    );
  });

  it('shares the selected schema with the other components below the provider', () => {
    function SchemaDisplay() {
      return <span data-test-subj="schema">{useProfilingSchemaState().schema}</span>;
    }
    const { getByTestId } = render(
      <ProfilingSchemaStateProvider>
        <ProfilingSchemaSelector
          start="2023-10-30T00:00:00.000Z"
          end="2023-10-30T00:15:00.000Z"
          kuery=""
        />
        <SchemaDisplay />
      </ProfilingSchemaStateProvider>
    );

    act(() => getSelectorProps().onSchemaChange(ProfilingSchema.OTEL));

    expect(getSelectorProps().schema).toBe(ProfilingSchema.OTEL);
    expect(getByTestId('schema')).toHaveTextContent(ProfilingSchema.OTEL);
  });
});
