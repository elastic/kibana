/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';

import { FormTestComponent } from '../../../common/test_utils';
import { Edit } from './edit';
import { customFieldsMock, customFieldsConfigurationMock } from '../../../containers/mock';
import userEvent from '@testing-library/user-event';
import type { CaseCustomFieldDate } from '../../../../common/types/domain';
import moment from 'moment';

describe('Edit ', () => {
  const onSubmit = jest.fn();

  beforeEach(() => {
    moment.tz.setDefault('UTC');
    jest.clearAllMocks();
  });
  afterEach(() => {
    moment.tz.setDefault('Browser');
  });

  moment.locale('en');

  const customField = customFieldsMock[4] as CaseCustomFieldDate;
  const customFieldConfiguration = customFieldsConfigurationMock[4];

  it('renders correctly', async () => {
    render(
      <FormTestComponent onSubmit={onSubmit}>
        <Edit
          customField={customField}
          customFieldConfiguration={customFieldConfiguration}
          onSubmit={onSubmit}
          isLoading={false}
          canUpdate={true}
        />
      </FormTestComponent>
    );

    expect(
      await screen.findByTestId(`case-date-custom-field-${customFieldConfiguration.key}`)
    ).toBeInTheDocument();
    expect(
      await screen.findByTestId(
        `case-date-custom-field-edit-button-${customFieldConfiguration.key}`
      )
    ).toBeInTheDocument();
    expect(await screen.findByText(customFieldConfiguration.label)).toBeInTheDocument();
    expect(await screen.findByText('28/02/2024, 00:00:00')).toBeInTheDocument();
  });

  it('does not shows the edit button if the user does not have permissions', async () => {
    render(
      <FormTestComponent onSubmit={onSubmit}>
        <Edit
          customField={customField}
          customFieldConfiguration={customFieldConfiguration}
          onSubmit={onSubmit}
          isLoading={false}
          canUpdate={false}
        />
      </FormTestComponent>
    );

    expect(
      screen.queryByTestId(`case-date-custom-field-edit-button-${customFieldConfiguration.key}`)
    ).not.toBeInTheDocument();
  });

  it('does not shows the edit button when loading', async () => {
    render(
      <FormTestComponent onSubmit={onSubmit}>
        <Edit
          customField={customField}
          customFieldConfiguration={customFieldConfiguration}
          onSubmit={onSubmit}
          isLoading={true}
          canUpdate={true}
        />
      </FormTestComponent>
    );

    expect(
      screen.queryByTestId(`case-date-custom-field-edit-button-${customFieldConfiguration.key}`)
    ).not.toBeInTheDocument();
  });

  it('shows the loading spinner when loading', async () => {
    render(
      <FormTestComponent onSubmit={onSubmit}>
        <Edit
          customField={customField}
          customFieldConfiguration={customFieldConfiguration}
          onSubmit={onSubmit}
          isLoading={true}
          canUpdate={true}
        />
      </FormTestComponent>
    );

    expect(
      await screen.findByTestId(`case-date-custom-field-loading-${customFieldConfiguration.key}`)
    ).toBeInTheDocument();
  });

  it('shows the no value text if the custom field is undefined', async () => {
    render(
      <FormTestComponent onSubmit={onSubmit}>
        <Edit
          customFieldConfiguration={customFieldConfiguration}
          onSubmit={onSubmit}
          isLoading={false}
          canUpdate={true}
        />
      </FormTestComponent>
    );

    expect(await screen.findByText('No value is added')).toBeInTheDocument();
    expect(
      screen.queryByTestId(`date-custom-field-view-${customFieldConfiguration.key}`)
    ).not.toBeInTheDocument();
  });

  it('uses the required value correctly if a required field is empty', async () => {
    render(
      <FormTestComponent onSubmit={onSubmit}>
        <Edit
          customField={{ ...customField, value: null }}
          customFieldConfiguration={customFieldConfiguration}
          onSubmit={onSubmit}
          isLoading={false}
          canUpdate={true}
        />
      </FormTestComponent>
    );

    expect(await screen.findByText('No value is added')).toBeInTheDocument();
    await userEvent.click(
      await screen.findByTestId(
        `case-date-custom-field-edit-button-${customFieldConfiguration.key}`
      )
    );

    const customFieldValue = await screen.findByTestId(
      `case-date-custom-field-form-field-${customFieldConfiguration.key}`
    );

    const defaultValueDatePicker = await within(customFieldValue).findByDisplayValue(
      '10/16/2024 12:39 PM'
    );

    expect(defaultValueDatePicker).toBeInTheDocument();

    expect(
      await screen.findByText('This field is populated with the default value.')
    ).toBeInTheDocument();

    await userEvent.click(
      await screen.findByTestId(
        `case-date-custom-field-submit-button-${customFieldConfiguration.key}`
      )
    );

    await waitFor(() => {
      expect(onSubmit).toBeCalledWith({
        ...customField,
        value: customFieldConfiguration.defaultValue,
      });
    });
  });

  it('does not show the value when the value is null', async () => {
    render(
      <FormTestComponent onSubmit={onSubmit}>
        <Edit
          customField={{ ...customField, value: null }}
          customFieldConfiguration={customFieldConfiguration}
          onSubmit={onSubmit}
          isLoading={false}
          canUpdate={true}
        />
      </FormTestComponent>
    );

    expect(
      screen.queryByTestId(`date-custom-field-view-${customFieldConfiguration.key}`)
    ).not.toBeInTheDocument();
  });

  it('does not show the form when the user does not have permissions', async () => {
    render(
      <FormTestComponent onSubmit={onSubmit}>
        <Edit
          customField={customField}
          customFieldConfiguration={customFieldConfiguration}
          onSubmit={onSubmit}
          isLoading={false}
          canUpdate={false}
        />
      </FormTestComponent>
    );

    expect(
      screen.queryByTestId(`case-date-custom-field-form-field-${customFieldConfiguration.key}`)
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId(`case-date-custom-field-submit-button-${customFieldConfiguration.key}`)
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId(`case-date-custom-field-cancel-button-${customFieldConfiguration.key}`)
    ).not.toBeInTheDocument();
  });

  it('calls onSubmit when changing value', async () => {
    const inputDate = '08/08/2019 06:29 PM';

    render(
      <FormTestComponent onSubmit={onSubmit}>
        <Edit
          customField={customField}
          customFieldConfiguration={customFieldConfiguration}
          onSubmit={onSubmit}
          isLoading={false}
          canUpdate={true}
        />
      </FormTestComponent>
    );

    await userEvent.click(
      await screen.findByTestId(
        `case-date-custom-field-edit-button-${customFieldConfiguration.key}`
      )
    );

    const customFieldValue = await screen.findByTestId(
      `case-date-custom-field-form-field-${customFieldConfiguration.key}`
    );

    await userEvent.click(customFieldValue);

    const defaultValueDatePicker = await within(customFieldValue).findByDisplayValue(
      '02/28/2024 12:00 AM'
    );

    fireEvent.change(defaultValueDatePicker, {
      target: { value: inputDate },
    });

    expect(
      await screen.findByTestId(
        `case-date-custom-field-submit-button-${customFieldConfiguration.key}`
      )
    ).not.toBeDisabled();

    await userEvent.click(
      await screen.findByTestId(
        `case-date-custom-field-submit-button-${customFieldConfiguration.key}`
      )
    );

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          key: 'test_key_date_1',
          type: 'date',
          value: expect.any(moment),
        })
      );

      expect(onSubmit.mock.calls[0][0].value.format()).toBe('2019-08-08T18:29:00Z');
    });
  });

  it('sets the value to null if the text field is empty', async () => {
    render(
      <FormTestComponent onSubmit={onSubmit}>
        <Edit
          customField={customField}
          customFieldConfiguration={{ ...customFieldConfiguration, required: false }}
          onSubmit={onSubmit}
          isLoading={false}
          canUpdate={true}
        />
      </FormTestComponent>
    );

    await userEvent.click(
      await screen.findByTestId(
        `case-date-custom-field-edit-button-${customFieldConfiguration.key}`
      )
    );

    const customFieldValue = await screen.findByTestId(
      `case-date-custom-field-form-field-${customFieldConfiguration.key}`
    );

    await userEvent.click(await within(customFieldValue).findByLabelText('Clear input'));

    await userEvent.click(
      await screen.findByTestId(
        `case-date-custom-field-submit-button-${customFieldConfiguration.key}`
      )
    );

    await waitFor(() => {
      expect(onSubmit).toBeCalledWith({
        ...customField,
        value: null,
      });
    });
  });

  it('reset to initial value when canceling', async () => {
    const inputDate = '08/08/2019 06:29 PM';
    render(
      <FormTestComponent onSubmit={onSubmit}>
        <Edit
          customField={customField}
          customFieldConfiguration={customFieldConfiguration}
          onSubmit={onSubmit}
          isLoading={false}
          canUpdate={true}
        />
      </FormTestComponent>
    );

    await userEvent.click(
      await screen.findByTestId(
        `case-date-custom-field-edit-button-${customFieldConfiguration.key}`
      )
    );

    const customFieldValue = await screen.findByTestId(
      `case-date-custom-field-form-field-${customFieldConfiguration.key}`
    );

    await userEvent.click(customFieldValue);

    const defaultValueDatePicker = await within(customFieldValue).findByDisplayValue(
      '02/28/2024 12:00 AM'
    );

    fireEvent.change(defaultValueDatePicker, {
      target: { value: inputDate },
    });

    await userEvent.click(
      await screen.findByTestId(
        `case-date-custom-field-cancel-button-${customFieldConfiguration.key}`
      )
    );

    expect(
      screen.queryByTestId(`case-date-custom-field-form-field-${customFieldConfiguration.key}`)
    ).not.toBeInTheDocument();

    expect(await screen.findByText('28/02/2024, 00:00:00')).toBeInTheDocument();
  });

  it('shows validation error if the field is required', async () => {
    render(
      <FormTestComponent onSubmit={onSubmit}>
        <Edit
          customField={customField}
          customFieldConfiguration={customFieldConfiguration}
          onSubmit={onSubmit}
          isLoading={false}
          canUpdate={true}
        />
      </FormTestComponent>
    );

    await userEvent.click(
      await screen.findByTestId(
        `case-date-custom-field-edit-button-${customFieldConfiguration.key}`
      )
    );

    const customFieldValue = await screen.findByTestId(
      `case-date-custom-field-form-field-${customFieldConfiguration.key}`
    );

    await userEvent.click(await within(customFieldValue).findByLabelText('Clear input'));

    await userEvent.click(
      await screen.findByTestId(
        `case-date-custom-field-submit-button-${customFieldConfiguration.key}`
      )
    );

    expect(
      await screen.findByText(`${customFieldConfiguration.label} is required.`)
    ).toBeInTheDocument();
  });

  it('does not show a validation error if the field is not required', async () => {
    render(
      <FormTestComponent onSubmit={onSubmit}>
        <Edit
          customField={customField}
          customFieldConfiguration={{ ...customFieldConfiguration, required: false }}
          onSubmit={onSubmit}
          isLoading={false}
          canUpdate={true}
        />
      </FormTestComponent>
    );

    await userEvent.click(
      await screen.findByTestId(
        `case-date-custom-field-edit-button-${customFieldConfiguration.key}`
      )
    );

    const customFieldValue = await screen.findByTestId(
      `case-date-custom-field-form-field-${customFieldConfiguration.key}`
    );
    await userEvent.click(await within(customFieldValue).findByLabelText('Clear input'));

    expect(
      await screen.findByTestId(
        `case-date-custom-field-submit-button-${customFieldConfiguration.key}`
      )
    ).not.toBeDisabled();

    expect(
      screen.queryByText(`${customFieldConfiguration.label} is required.`)
    ).not.toBeInTheDocument();
  });
});
