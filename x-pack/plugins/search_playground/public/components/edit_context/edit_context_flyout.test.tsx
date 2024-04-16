/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import { EditContextFlyout } from './edit_context_flyout';
import { FormProvider, useForm } from 'react-hook-form';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';

jest.mock('../../hooks/use_indices_fields', () => ({
  useIndicesFields: () => ({
    fields: {
      index1: {
        elser_query_fields: [],
        dense_vector_query_fields: [],
        bm25_query_fields: ['field1', 'field2'],
        source_fields: ['context_field1', 'context_field2'],
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

describe('EditContextFlyout component tests', () => {
  const onCloseMock = jest.fn();

  beforeEach(() => {
    render(
      <IntlProvider locale="en">
        <MockFormProvider>
          <EditContextFlyout onClose={onCloseMock} />
        </MockFormProvider>
      </IntlProvider>
    );
  });

  it('calls onClose when the close button is clicked', () => {
    fireEvent.click(screen.getByTestId('euiFlyoutCloseButton'));
    expect(onCloseMock).toHaveBeenCalledTimes(1);
  });

  it('should see the context fields', async () => {
    expect(screen.getByTestId('contextFieldsSelectable')).toBeInTheDocument();
    expect(screen.getByTestId('contextFieldsSelectable')).toHaveTextContent(`context_field2`);
    expect(screen.getByTestId('contextFieldsSelectable')).toHaveTextContent(`context_field1`);
  });
});
