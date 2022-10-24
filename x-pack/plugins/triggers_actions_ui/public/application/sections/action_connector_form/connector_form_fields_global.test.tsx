/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import userEvent from '@testing-library/user-event';
import { render, act } from '@testing-library/react';
import { FormTestProvider } from '../../components/test_utils';
import { ConnectorFormFieldsGlobal } from './connector_form_fields_global';

describe('ConnectorFormFieldsGlobal', () => {
  const onSubmit = jest.fn();
  const defaultValue = {
    id: 'test-id',
    actionTypeId: '.test',
    isDeprecated: 'false',
    name: 'My test connector',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('submits correctly', async () => {
    const { getByTestId } = render(
      <FormTestProvider onSubmit={onSubmit} defaultValue={defaultValue}>
        <ConnectorFormFieldsGlobal canSave={true} />
      </FormTestProvider>
    );

    expect(getByTestId('nameInput')).toBeInTheDocument();

    await act(async () => {
      userEvent.click(getByTestId('form-test-provide-submit'));
    });

    expect(onSubmit).toHaveBeenCalledWith({
      data: {
        actionTypeId: '.test',
        id: 'test-id',
        isDeprecated: 'false',
        name: 'My test connector',
      },
      isValid: true,
    });
  });

  it('validates the name correctly', async () => {
    const { getByTestId, getByText } = render(
      /**
       * By removing the default value we initiate the form
       * with an empty state. Submitting the form
       * should return an error because the text field "name"
       * is empty.
       */
      <FormTestProvider onSubmit={onSubmit}>
        <ConnectorFormFieldsGlobal canSave={true} />
      </FormTestProvider>
    );

    await act(async () => {
      userEvent.click(getByTestId('form-test-provide-submit'));
    });

    expect(getByText('Name is required.')).toBeInTheDocument();
    expect(onSubmit).toHaveBeenCalledWith({
      data: {},
      isValid: false,
    });
  });
});
