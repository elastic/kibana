/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { EmbeddableProfilingSearchBar } from '@kbn/observability-shared-plugin/public';
import { ProfilingSchema } from '@kbn/profiling-utils';
import { ProfilingHeaderSearchBar } from './profiling_header_search_bar';

jest.mock('@kbn/observability-shared-plugin/public', () => ({
  EmbeddableProfilingSearchBar: jest.fn(() => null),
  useProfilingSchemaState: () => ({ schema: 'otel', setSchema: jest.fn() }),
}));
jest.mock('react-router-dom', () => ({ useHistory: () => ({}) }));
jest.mock('../../../hooks/use_apm_params', () => ({
  useApmParams: () => ({ query: { rangeFrom: 'now-15m', rangeTo: 'now', kuery: '' } }),
}));
jest.mock('../../../hooks/use_time_range', () => ({
  useTimeRange: () => ({ refreshTimeRange: jest.fn() }),
}));
jest.mock('../../../context/apm_service/use_apm_service_context', () => ({
  useApmServiceContext: () => ({ agentName: 'nodejs' }),
}));
jest.mock('../../shared/search_bar/search_bar', () => ({ SearchBar: () => null }));

describe('ProfilingHeaderSearchBar', () => {
  it('suggests the fields of the selected profiling schema', () => {
    render(<ProfilingHeaderSearchBar />);

    expect(EmbeddableProfilingSearchBar).toHaveBeenCalledWith(
      expect.objectContaining({ schema: ProfilingSchema.OTEL }),
      expect.anything()
    );
  });
});
