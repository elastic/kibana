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

// FLAKY: https://github.com/elastic/kibana/issues/177304
describe.skip('Create ', () => {
  const onSubmit = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const customFieldConfiguration = customFieldsConfigurationMock[1];

  it('renders correctly with required and defaultValue', async () => {
    render(
      <FormTestComponent onSubmit={onSubmit}>
        <Create isLoading={false} customFieldConfiguration={customFieldConfiguration} />
      </FormTestComponent>
    );

    expect(await screen.findByText(customFieldConfiguration.label)).toBeInTheDocument();
    expect(
      await screen.findByTestId(`${customFieldConfiguration.key}-toggle-create-custom-field`)
    ).toBeInTheDocument();
    expect(await screen.findByRole('switch')).toBeChecked(); // defaultValue true
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

    expect(await screen.findByRole('switch')).not.toBeChecked();
  });

  it('updates the value correctly', async () => {
    render(
      <FormTestComponent onSubmit={onSubmit}>
        <Create isLoading={false} customFieldConfiguration={customFieldConfiguration} />
      </FormTestComponent>
    );

    userEvent.click(await screen.findByRole('switch'));
    userEvent.click(await screen.findByText('Submit'));

    await waitFor(() => {
      // data, isValid
      expect(onSubmit).toHaveBeenCalledWith(
        {
          customFields: {
            [customFieldConfiguration.key]: false,
          },
        },
        true
      );
    });
  });

  it('sets value to false by default when there is no defaultValue configured', async () => {
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

    userEvent.click(await screen.findByText('Submit'));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        {
          customFields: {
            [customFieldConfiguration.key]: false,
          },
        },
        true
      );
    });
  });

  it('disables the toggle when loading', async () => {
    render(
      <FormTestComponent onSubmit={onSubmit}>
        <Create isLoading={true} customFieldConfiguration={customFieldConfiguration} />
      </FormTestComponent>
    );

    expect(await screen.findByRole('switch')).toBeDisabled();
  });
});
