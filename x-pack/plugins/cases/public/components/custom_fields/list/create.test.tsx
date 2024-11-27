/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { ListCustomFieldConfiguration } from '../../../../common/types/domain';
import { FormTestComponent } from '../../../common/test_utils';
import { Create } from './create';
import { customFieldsConfigurationMock } from '../../../containers/mock';

describe('Create', () => {
  const onSubmit = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // required list custom field with a default value
  const customFieldConfiguration = customFieldsConfigurationMock[6] as ListCustomFieldConfiguration;

  it('renders correctly with default values', async () => {
    render(
      <FormTestComponent onSubmit={onSubmit}>
        <Create isLoading={false} customFieldConfiguration={customFieldConfiguration} />
      </FormTestComponent>
    );

    expect(await screen.findByText(customFieldConfiguration.label)).toBeInTheDocument();

    expect(
      await screen.findByTestId(`${customFieldConfiguration.key}-list-create-custom-field`)
    ).toHaveValue(customFieldConfiguration.defaultValue);
  });

  it('renders correctly with optional fields', async () => {
    const optionalField = customFieldsConfigurationMock[7] as ListCustomFieldConfiguration; // optional list custom field

    render(
      <FormTestComponent onSubmit={onSubmit}>
        <Create isLoading={false} customFieldConfiguration={optionalField} />
      </FormTestComponent>
    );

    expect(await screen.findByText(optionalField.label)).toBeInTheDocument();
    expect(await screen.findByTestId(`${optionalField.key}-list-create-custom-field`)).toHaveValue(
      ''
    );
  });

  it('does not render default value when setDefaultValue is false', async () => {
    render(
      <FormTestComponent onSubmit={onSubmit}>
        <Create
          isLoading={false}
          customFieldConfiguration={customFieldConfiguration}
          setDefaultValue={false}
        />
      </FormTestComponent>
    );

    expect(
      await screen.findByTestId(`${customFieldConfiguration.key}-list-create-custom-field`)
    ).toHaveValue('');
  });

  it('renders loading state correctly', async () => {
    render(
      <FormTestComponent onSubmit={onSubmit}>
        <Create isLoading={true} customFieldConfiguration={customFieldConfiguration} />
      </FormTestComponent>
    );

    expect(await screen.findByRole('progressbar')).toBeInTheDocument();
  });

  it('disables the select field when loading', async () => {
    render(
      <FormTestComponent onSubmit={onSubmit}>
        <Create isLoading={true} customFieldConfiguration={customFieldConfiguration} />
      </FormTestComponent>
    );

    expect(
      await screen.findByTestId(`${customFieldConfiguration.key}-list-create-custom-field`)
    ).toHaveAttribute('disabled');
  });

  it('updates the value correctly', async () => {
    render(
      <FormTestComponent onSubmit={onSubmit}>
        <Create isLoading={false} customFieldConfiguration={customFieldConfiguration} />
      </FormTestComponent>
    );

    const listCustomField = await screen.findByTestId(
      `${customFieldConfiguration.key}-list-create-custom-field`
    );

    await userEvent.selectOptions(
      listCustomField,
      await screen.getByRole('option', { name: 'Option 2' })
    );

    await userEvent.click(await screen.findByText('Submit'));

    await waitFor(() => {
      // data, isValid
      expect(onSubmit).toHaveBeenCalledWith(
        {
          customFields: {
            [customFieldConfiguration.key]: 'option_2',
          },
        },
        true
      );
    });
  });

  it('shows error when selection is required but is empty', async () => {
    render(
      <FormTestComponent onSubmit={onSubmit}>
        <Create
          isLoading={false}
          customFieldConfiguration={{
            ...customFieldConfiguration,
            defaultValue: undefined,
            required: true,
          }}
        />
      </FormTestComponent>
    );

    await userEvent.click(await screen.findByText('Submit'));

    expect(
      await screen.findByText(`${customFieldConfiguration.label} is required.`)
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({}, false);
    });
  });

  it('does not show error when selection is not required but is empty', async () => {
    render(
      <FormTestComponent onSubmit={onSubmit}>
        <Create
          isLoading={false}
          customFieldConfiguration={{
            ...customFieldConfiguration,
            defaultValue: undefined,
            required: false,
          }}
        />
      </FormTestComponent>
    );

    await userEvent.click(await screen.findByText('Submit'));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({}, true);
    });
  });
});
