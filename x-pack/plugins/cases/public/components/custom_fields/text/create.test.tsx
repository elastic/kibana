/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { FormTestComponent } from '../../../common/test_utils';
import { Create } from './create';
import { customFieldsConfigurationMock } from '../../../containers/mock';
import { MAX_CUSTOM_FIELD_TEXT_VALUE_LENGTH } from '../../../../common/constants';

describe('Create ', () => {
  const onSubmit = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  // required text custom field with a default value
  const customFieldConfiguration = customFieldsConfigurationMock[0];

  it('renders correctly with default values', async () => {
    render(
      <FormTestComponent onSubmit={onSubmit}>
        <Create isLoading={false} customFieldConfiguration={customFieldConfiguration} />
      </FormTestComponent>
    );

    expect(await screen.findByText(customFieldConfiguration.label)).toBeInTheDocument();

    expect(
      await screen.findByTestId(`${customFieldConfiguration.key}-text-create-custom-field`)
    ).toHaveValue(customFieldConfiguration.defaultValue as string);
  });

  it('renders correctly with optional fields', async () => {
    const optionalField = customFieldsConfigurationMock[2]; // optional text custom field

    render(
      <FormTestComponent onSubmit={onSubmit}>
        <Create isLoading={false} customFieldConfiguration={optionalField} />
      </FormTestComponent>
    );

    expect(await screen.findByText(optionalField.label)).toBeInTheDocument();
    expect(await screen.findByTestId(`${optionalField.key}-text-create-custom-field`)).toHaveValue(
      ''
    );
  });

  // double act error
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
      await screen.findByTestId(`${customFieldConfiguration.key}-text-create-custom-field`)
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

  it('disables the text when loading', async () => {
    render(
      <FormTestComponent onSubmit={onSubmit}>
        <Create isLoading={true} customFieldConfiguration={customFieldConfiguration} />
      </FormTestComponent>
    );

    expect(
      await screen.findByTestId(`${customFieldConfiguration.key}-text-create-custom-field`)
    ).toHaveAttribute('disabled');
  });

  it('updates the value correctly', async () => {
    render(
      <FormTestComponent onSubmit={onSubmit}>
        <Create isLoading={false} customFieldConfiguration={customFieldConfiguration} />
      </FormTestComponent>
    );

    const textCustomField = await screen.findByTestId(
      `${customFieldConfiguration.key}-text-create-custom-field`
    );

    await userEvent.clear(textCustomField);
    await userEvent.click(textCustomField);
    await userEvent.paste('this is a sample text!');
    await userEvent.click(await screen.findByText('Submit'));

    await waitFor(() => {
      // data, isValid
      expect(onSubmit).toHaveBeenCalledWith(
        {
          customFields: {
            [customFieldConfiguration.key]: 'this is a sample text!',
          },
        },
        true
      );
    });
  });

  it('shows error when text is too long', async () => {
    render(
      <FormTestComponent onSubmit={onSubmit}>
        <Create isLoading={false} customFieldConfiguration={customFieldConfiguration} />
      </FormTestComponent>
    );

    const sampleText = 'a'.repeat(MAX_CUSTOM_FIELD_TEXT_VALUE_LENGTH + 1);

    await userEvent.click(
      await screen.findByTestId(`${customFieldConfiguration.key}-text-create-custom-field`)
    );
    await userEvent.paste(sampleText);

    await userEvent.click(await screen.findByText('Submit'));

    expect(
      await screen.findByText(
        `The length of the ${customFieldConfiguration.label} is too long. The maximum length is ${MAX_CUSTOM_FIELD_TEXT_VALUE_LENGTH} characters.`
      )
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({}, false);
    });
  });

  it('shows error when text is too long and field is optional', async () => {
    render(
      <FormTestComponent onSubmit={onSubmit}>
        <Create
          isLoading={false}
          customFieldConfiguration={{ ...customFieldConfiguration, required: false }}
        />
      </FormTestComponent>
    );

    const sampleText = 'a'.repeat(MAX_CUSTOM_FIELD_TEXT_VALUE_LENGTH + 1);

    await userEvent.click(
      await screen.findByTestId(`${customFieldConfiguration.key}-text-create-custom-field`)
    );
    await userEvent.paste(sampleText);
    await userEvent.click(await screen.findByText('Submit'));

    expect(
      await screen.findByText(
        `The length of the ${customFieldConfiguration.label} is too long. The maximum length is ${MAX_CUSTOM_FIELD_TEXT_VALUE_LENGTH} characters.`
      )
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({}, false);
    });
  });

  it('shows error when text is required but is empty', async () => {
    render(
      <FormTestComponent onSubmit={onSubmit}>
        <Create
          isLoading={false}
          customFieldConfiguration={{ ...customFieldConfiguration, required: true }}
        />
      </FormTestComponent>
    );

    await userEvent.clear(
      await screen.findByTestId(`${customFieldConfiguration.key}-text-create-custom-field`)
    );
    await userEvent.click(await screen.findByText('Submit'));

    expect(
      await screen.findByText(`${customFieldConfiguration.label} is required.`)
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({}, false);
    });
  });

  it('does not show error when text is not required but is empty', async () => {
    render(
      <FormTestComponent onSubmit={onSubmit}>
        <Create
          isLoading={false}
          customFieldConfiguration={{
            key: customFieldConfiguration.key,
            type: customFieldConfiguration.type,
            label: customFieldConfiguration.label,
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
