/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ViewQueryFlyout } from './view_query_flyout';
import { FormProvider, useForm } from 'react-hook-form';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';

jest.mock('../../hooks/use_indices_fields', () => ({
  useIndicesFields: () => ({
    fields: {
      index1: {
        elser_query_fields: [],
        dense_vector_query_fields: [],
        bm25_query_fields: ['field1', 'field2'],
      },
    },
  }),
}));

const MockFormProvider = ({ children }: { children: React.ReactElement }) => {
  const methods = useForm({
    values: {
      indices: ['index1'],
    },
  });
  return <FormProvider {...methods}>{children}</FormProvider>;
};

describe('ViewQueryFlyout component tests', () => {
  const onCloseMock = jest.fn();

  let wrapper: any;

  beforeEach(() => {
    wrapper = render(
      <IntlProvider locale="en">
        <MockFormProvider>
          <ViewQueryFlyout onClose={onCloseMock} />
        </MockFormProvider>
      </IntlProvider>
    );
  });

  it('renders correctly', () => {
    expect(screen.getByText('Customise your Elasticsearch Query')).toBeInTheDocument();
    expect(screen.getByText('Close')).toBeInTheDocument();
    expect(screen.getByText('Save changes')).toBeInTheDocument();
  });

  it('calls onClose when the close button is clicked', () => {
    fireEvent.click(screen.getByText('Close'));
    expect(onCloseMock).toHaveBeenCalledTimes(1);
  });

  it('should see the view elasticsearch query', async () => {
    const { getByTestId } = wrapper;
    expect(getByTestId('ViewElasticsearchQueryResult')).toBeInTheDocument();
    expect(getByTestId('ViewElasticsearchQueryResult')).toHaveTextContent(
      `{ "query": { "bool": { "should": [ { "multi_match": { "query": "{query}", "fields": [ "field1" ] } } ], "minimum_should_match": 1 } } }`
    );
  });

});
