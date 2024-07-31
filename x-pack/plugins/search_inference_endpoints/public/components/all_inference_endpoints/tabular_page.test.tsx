/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import { render } from '@testing-library/react';
import { TabularPage } from './tabular_page';
import { InferenceAPIConfigResponse } from '@kbn/ml-trained-models-utils';
import { TRAINED_MODEL_STATS_QUERY_KEY } from '../../../common/constants';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const inferenceEndpoints = [
  {
    model_id: 'my-elser-model-05',
    task_type: 'sparse_embedding',
    service: 'elser',
    service_settings: {
      num_allocations: 1,
      num_threads: 1,
      model_id: '.elser_model_2',
    },
    task_settings: {},
  },
  {
    model_id: 'my-elser-model-04',
    task_type: 'sparse_embedding',
    service: 'elser',
    service_settings: {
      num_allocations: 1,
      num_threads: 1,
      model_id: '.elser_model_2',
    },
    task_settings: {},
  },
] as InferenceAPIConfigResponse[];

jest.mock('../../hooks/use_delete_endpoint', () => ({
  useDeleteEndpoint: () => ({
    mutate: jest.fn().mockImplementation(() => Promise.resolve()), // Mock implementation of the mutate function
  }),
}));

describe('When the tabular page is loaded', () => {
  const queryClient = new QueryClient();
  queryClient.setQueryData([TRAINED_MODEL_STATS_QUERY_KEY], {
    trained_model_stats: [{ model_id: '.elser_model_2', deployment_stats: { state: 'started' } }],
  });
  const wrapper = ({ children }: { children: React.ReactNode }) => {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
  beforeEach(() => {
    render(wrapper({ children: <TabularPage inferenceEndpoints={inferenceEndpoints} /> }));
  });

  it('should display all model_ids in the table', () => {
    const rows = screen.getAllByRole('row');
    expect(rows[1]).toHaveTextContent('my-elser-model-04');
    expect(rows[2]).toHaveTextContent('my-elser-model-05');
  });
});
