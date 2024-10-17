/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import moment from 'moment';

import { FormTestComponent } from '../../../common/test_utils';
import { Create } from './create';
import { customFieldsConfigurationMock } from '../../../containers/mock';
import type { CasesConfigurationUICustomField } from '../../../../common/ui/types';

describe('Create ', () => {
  const onSubmit = jest.fn();

  beforeEach(() => {
    moment.tz.setDefault('UTC');
    jest.clearAllMocks();
  });
  afterEach(() => {
    moment.tz.setDefault('Browser');
  });

  moment.locale('en');

  const customFieldConfiguration = customFieldsConfigurationMock[4];

  it('renders correctly with default values', async () => {
    render(
      <FormTestComponent onSubmit={onSubmit}>
        <Create isLoading={false} customFieldConfiguration={customFieldConfiguration} />
      </FormTestComponent>
    );

    expect(await screen.findByText(customFieldConfiguration.label)).toBeInTheDocument();

    const dateCustomField = await screen.findByTestId(
      `${customFieldConfiguration.key}-date-create-custom-field`
    );

    expect(
      await within(dateCustomField).findByLabelText(customFieldConfiguration.label)
    ).toHaveValue('10/16/2024 12:39 PM');
  });

  it('renders correctly with optional fields', async () => {
    const optionalField = customFieldsConfigurationMock[5]; // optional date custom field

    render(
      <FormTestComponent onSubmit={onSubmit}>
        <Create isLoading={false} customFieldConfiguration={optionalField} />
      </FormTestComponent>
    );

    expect(await screen.findByText(optionalField.label)).toBeInTheDocument();
    const dateCustomField = await screen.findByTestId(
      `${optionalField.key}-date-create-custom-field`
    );

    expect(await within(dateCustomField).findByLabelText(optionalField.label)).toHaveValue('');
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

    const dateCustomField = await screen.findByTestId(
      `${customFieldConfiguration.key}-date-create-custom-field`
    );

    expect(
      await within(dateCustomField).findByLabelText(customFieldConfiguration.label)
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

    const dateCustomField = await screen.findByTestId(
      `${customFieldConfiguration.key}-date-create-custom-field`
    );

    expect(
      await within(dateCustomField).findByLabelText(customFieldConfiguration.label)
    ).toHaveAttribute('disabled');
  });

  it('updates the value correctly', async () => {
    const inputDate = '08/10/2019 06:29 PM';

    render(
      <FormTestComponent onSubmit={onSubmit}>
        <Create isLoading={false} customFieldConfiguration={customFieldConfiguration} />
      </FormTestComponent>
    );

    const dateCustomField = await screen.findByTestId(
      `${customFieldConfiguration.key}-date-create-custom-field`
    );

    const defaultValueDatePicker = await within(dateCustomField).findByDisplayValue(
      '10/16/2024 12:39 PM'
    );

    fireEvent.change(defaultValueDatePicker, {
      target: { value: inputDate },
    });

    await userEvent.click(await screen.findByTestId('form-test-component-submit-button'));

    await waitFor(() => {
      // data, isValid
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          customFields: {
            [customFieldConfiguration.key]: expect.any(moment),
          },
        }),
        true
      );

      expect(onSubmit.mock.calls[0][0].customFields[customFieldConfiguration.key].format()).toBe(
        '2019-08-10T18:29:00Z'
      );
    });
  });

  it('updates the value to null correctly', async () => {
    render(
      <FormTestComponent onSubmit={onSubmit}>
        <Create isLoading={false} customFieldConfiguration={customFieldConfiguration} />
      </FormTestComponent>
    );

    const dateCustomField = await screen.findByTestId(
      `${customFieldConfiguration.key}-date-create-custom-field`
    );

    await userEvent.click(await within(dateCustomField).findByLabelText('Clear input'));

    await userEvent.click(await screen.findByTestId('form-test-component-submit-button'));

    await waitFor(() => {
      // data, isValid
      expect(onSubmit).toHaveBeenCalledWith(
        {
          customFields: {
            [customFieldConfiguration.key]: null,
          },
        },
        true
      );
    });
  });

  it('shows error when date is required but is empty', async () => {
    render(
      <FormTestComponent onSubmit={onSubmit}>
        <Create
          isLoading={false}
          customFieldConfiguration={{
            ...customFieldConfiguration,
            defaultValue: null,
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

  it('shows error when date is invalid', async () => {
    render(
      <FormTestComponent onSubmit={onSubmit}>
        <Create
          isLoading={false}
          customFieldConfiguration={
            {
              ...customFieldConfiguration,
              defaultValue: 'invalid date',
              required: false,
            } as CasesConfigurationUICustomField
          }
        />
      </FormTestComponent>
    );

    await userEvent.click(await screen.findByText('Submit'));

    expect(await screen.findByText('Not a valid date')).toBeInTheDocument();

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({}, false);
    });
  });

  it('does not show error when date is not required but is empty', async () => {
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
