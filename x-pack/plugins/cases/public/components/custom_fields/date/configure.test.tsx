/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import moment from 'moment';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { FormTestComponent } from '../../../common/test_utils';
import { CustomFieldTypes } from '../../../../common/types/domain';
import { Configure } from './configure';

describe('Configure ', () => {
  const onSubmit = jest.fn();

  beforeEach(() => {
    moment.tz.setDefault('UTC');
    jest.clearAllMocks();
  });
  afterEach(() => {
    moment.tz.setDefault('Browser');
  });

  moment.locale('en');

  it('renders correctly', async () => {
    render(
      <FormTestComponent onSubmit={onSubmit}>
        <Configure />
      </FormTestComponent>
    );

    expect(await screen.findByTestId('date-custom-field-required')).toBeInTheDocument();
  });

  it('updates field options correctly when not required', async () => {
    render(
      <FormTestComponent onSubmit={onSubmit}>
        <Configure />
      </FormTestComponent>
    );

    await userEvent.click(await screen.findByTestId('form-test-component-submit-button'));

    await waitFor(() => {
      // data, isValid
      expect(onSubmit).toBeCalledWith({}, true);
    });
  });

  it('renders form initial value correctly', async () => {
    render(
      <FormTestComponent
        formDefaultValue={{
          key: 'my_custom_key',
          label: 'Custom date label',
          type: CustomFieldTypes.DATE,
          required: false,
          defaultValue: '2024-02-28T12:00:00Z',
        }}
        onSubmit={onSubmit}
      >
        <Configure />
      </FormTestComponent>
    );

    await userEvent.click(await screen.findByTestId('form-test-component-submit-button'));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        { defaultValue: '2024-02-28T12:00:00Z', required: false },
        true
      );
    });
  });

  it('updates field options with default value correctly when not required', async () => {
    const inputDate = '08/10/2019 06:29 PM';

    render(
      <FormTestComponent onSubmit={onSubmit}>
        <Configure />
      </FormTestComponent>
    );

    const defaultValue = await screen.findByTestId('date-custom-field-default-value');
    const defaultValueDatePicker = await within(defaultValue).findByPlaceholderText(
      'Select a date'
    );

    fireEvent.change(defaultValueDatePicker, {
      target: { value: inputDate },
    });

    await userEvent.click(await screen.findByTestId('form-test-component-submit-button'));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          defaultValue: expect.any(moment),
        }),
        true
      );
      expect(onSubmit.mock.calls[0][0].defaultValue.format()).toBe('2019-08-10T18:29:00Z');
    });
  });

  it('updates field options correctly when required', async () => {
    const newInputDate = '02/12/2020 12:00 AM';
    render(
      <FormTestComponent onSubmit={onSubmit}>
        <Configure />
      </FormTestComponent>
    );

    await userEvent.click(await screen.findByTestId('date-custom-field-required'));
    const defaultValue = await screen.findByTestId('date-custom-field-default-value');
    const defaultValueDatePicker = await within(defaultValue).findByPlaceholderText(
      'Select a date'
    );

    fireEvent.change(defaultValueDatePicker, {
      target: { value: newInputDate },
    });

    await userEvent.click(await screen.findByTestId('form-test-component-submit-button'));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          required: true,
          defaultValue: expect.any(moment),
        }),
        true
      );
      expect(onSubmit.mock.calls[0][0].defaultValue.format()).toBe('2020-02-12T00:00:00Z');
    });
  });
});
