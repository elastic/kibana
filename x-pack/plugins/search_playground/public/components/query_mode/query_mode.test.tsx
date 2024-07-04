/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { QueryMode } from './query_mode';
import { FormProvider, useForm } from 'react-hook-form';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';

jest.mock('../../hooks/use_indices_fields', () => ({
  useIndicesFields: () => ({
    fields: {
      index1: {
        elser_query_fields: [],
        dense_vector_query_fields: [],
        bm25_query_fields: ['field1', 'field2'],
        skipped_fields: 1,
      },
      index2: {
        elser_query_fields: [],
        dense_vector_query_fields: [],
        bm25_query_fields: ['field1', 'field2'],
        skipped_fields: 0,
      },
    },
  }),
}));

jest.mock('../../hooks/use_usage_tracker', () => ({
  useUsageTracker: () => ({
    count: jest.fn(),
    load: jest.fn(),
    click: jest.fn(),
  }),
}));

const MockFormProvider = ({ children }: { children: React.ReactElement }) => {
  const methods = useForm({
    values: {
      indices: ['index1', 'index2'],
    },
  });
  return <FormProvider {...methods}>{children}</FormProvider>;
};

describe('QueryMode component tests', () => {
  beforeEach(() => {
    render(
      <IntlProvider locale="en">
        <MockFormProvider>
          <QueryMode />
        </MockFormProvider>
      </IntlProvider>
    );
  });

  it('should see the view elasticsearch query', async () => {
    expect(screen.getByTestId('ViewElasticsearchQueryResult')).toBeInTheDocument();
    expect(screen.getByTestId('ViewElasticsearchQueryResult')).toHaveTextContent(
      `{ "retriever": { "rrf": { "retrievers": [ { "standard": { "query": { "multi_match": { "query": "{query}", "fields": [ "field1" ] } } } }, { "standard": { "query": { "multi_match": { "query": "{query}", "fields": [ "field1" ] } } } } ] } } }`
    );
  });

  it('displays query fields and indicates hidden fields', () => {
    expect(screen.getByTestId('queryFieldsSelectable_index1')).toBeInTheDocument();
    expect(screen.getByTestId('queryFieldsSelectable_index2')).toBeInTheDocument();

    // Check if hidden fields indicator is shown
    expect(screen.getByTestId('skipped_fields_index1')).toBeInTheDocument();
    expect(screen.getByTestId('skipped_fields_index1')).toHaveTextContent('1 fields are hidden.');

    // Check if hidden fields indicator is shown
    expect(screen.queryByTestId('skipped_fields_index2')).not.toBeInTheDocument();
  });
});
