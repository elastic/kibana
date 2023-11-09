/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
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

  const customFieldConfiguration = customFieldsConfigurationMock[0];

  it('renders correctly', async () => {
    render(
      <FormTestComponent onSubmit={onSubmit}>
        <Create isLoading={false} customFieldConfiguration={customFieldConfiguration} />
      </FormTestComponent>
    );

    expect(screen.getByText(customFieldConfiguration.label)).toBeInTheDocument();
    expect(
      screen.getByTestId(`${customFieldConfiguration.key}-text-create-custom-field`)
    ).toBeInTheDocument();
  });

  it('renders loading state correctly', async () => {
    render(
      <FormTestComponent onSubmit={onSubmit}>
        <Create isLoading={true} customFieldConfiguration={customFieldConfiguration} />
      </FormTestComponent>
    );

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('disables the text when loading', async () => {
    render(
      <FormTestComponent onSubmit={onSubmit}>
        <Create isLoading={true} customFieldConfiguration={customFieldConfiguration} />
      </FormTestComponent>
    );

    expect(
      screen.getByTestId(`${customFieldConfiguration.key}-text-create-custom-field`)
    ).toHaveAttribute('disabled');
  });

  it('updates the value correctly', async () => {
    render(
      <FormTestComponent onSubmit={onSubmit}>
        <Create isLoading={false} customFieldConfiguration={customFieldConfiguration} />
      </FormTestComponent>
    );

    userEvent.type(
      screen.getByTestId(`${customFieldConfiguration.key}-text-create-custom-field`),
      'this is a sample text!'
    );

    userEvent.click(screen.getByText('Submit'));

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

    userEvent.paste(
      screen.getByTestId(`${customFieldConfiguration.key}-text-create-custom-field`),
      sampleText
    );

    userEvent.click(screen.getByText('Submit'));

    await waitFor(() => {
      expect(
        screen.getByText(
          `The length of the ${customFieldConfiguration.label} is too long. The maximum length is ${MAX_CUSTOM_FIELD_TEXT_VALUE_LENGTH} characters.`
        )
      ).toBeInTheDocument();
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

    userEvent.paste(
      screen.getByTestId(`${customFieldConfiguration.key}-text-create-custom-field`),
      sampleText
    );

    userEvent.click(screen.getByText('Submit'));

    await waitFor(() => {
      expect(
        screen.getByText(
          `The length of the ${customFieldConfiguration.label} is too long. The maximum length is ${MAX_CUSTOM_FIELD_TEXT_VALUE_LENGTH} characters.`
        )
      ).toBeInTheDocument();
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

    userEvent.paste(
      screen.getByTestId(`${customFieldConfiguration.key}-text-create-custom-field`),
      ''
    );

    userEvent.click(screen.getByText('Submit'));

    await waitFor(() => {
      expect(
        screen.getByText(`${customFieldConfiguration.label} is required.`)
      ).toBeInTheDocument();
      expect(onSubmit).toHaveBeenCalledWith({}, false);
    });
  });

  it('does not show error when text is not required but is empty', async () => {
    render(
      <FormTestComponent onSubmit={onSubmit}>
        <Create
          isLoading={false}
          customFieldConfiguration={{ ...customFieldConfiguration, required: false }}
        />
      </FormTestComponent>
    );

    userEvent.click(screen.getByText('Submit'));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({}, true);
    });
  });
});
