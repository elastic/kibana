/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';

import { FormTestComponent } from '../../../common/test_utils';
import { Create } from './create';
import { customFieldsConfigurationMock } from '../../../containers/mock';
import userEvent from '@testing-library/user-event';

describe('Create ', () => {
  const onSubmit = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const customFieldConfiguration = customFieldsConfigurationMock[1];

  it('renders correctly', async () => {
    render(
      <FormTestComponent onSubmit={onSubmit}>
        <Create isLoading={false} customFieldConfiguration={customFieldConfiguration} />
      </FormTestComponent>
    );

    expect(screen.getByText(customFieldConfiguration.label)).toBeInTheDocument();
    expect(
      screen.getByTestId(`${customFieldConfiguration.label}-toggle-create-custom-field`)
    ).toBeInTheDocument();
    expect(screen.getByRole('switch')).not.toBeChecked();
  });

  it('updates the value correctly', async () => {
    render(
      <FormTestComponent onSubmit={onSubmit}>
        <Create isLoading={false} customFieldConfiguration={customFieldConfiguration} />
      </FormTestComponent>
    );

    userEvent.click(screen.getByRole('switch'));

    userEvent.click(screen.getByText('Submit'));

    await waitFor(() => {
      // data, isValid
      expect(onSubmit).toHaveBeenCalledWith(
        {
          [customFieldConfiguration.key]: true,
        },
        true
      );
    });
  });

  it('shows error when text is not set is required', async () => {
    render(
      <FormTestComponent onSubmit={onSubmit}>
        <Create
          isLoading={false}
          customFieldConfiguration={{ ...customFieldConfiguration, required: true }}
        />
      </FormTestComponent>
    );

    userEvent.click(screen.getByText('Submit'));

    await waitFor(() => {
      expect(
        screen.getByText(`${customFieldConfiguration.label} is required.`)
      ).toBeInTheDocument();
      expect(onSubmit).toHaveBeenCalledWith({}, false);
    });
  });

  it('disables the toggle when loading', async () => {
    render(
      <FormTestComponent onSubmit={onSubmit}>
        <Create isLoading={true} customFieldConfiguration={customFieldConfiguration} />
      </FormTestComponent>
    );

    expect(screen.getByRole('switch')).toBeDisabled();
  });
});
