/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';

import { FormTestComponent } from '../../../common/test_utils';
import { Edit } from './edit';
import { customFieldsMock, customFieldsConfigurationMock } from '../../../containers/mock';
import userEvent from '@testing-library/user-event';
import type { CaseCustomFieldToggle } from '../../../../common/types/domain';

describe('Edit ', () => {
  const onSubmit = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const customField = customFieldsMock[1] as CaseCustomFieldToggle;
  const customFieldConfiguration = customFieldsConfigurationMock[1];

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

    expect(screen.getByText(customFieldConfiguration.label)).toBeInTheDocument();
    expect(screen.getByTestId('case-toggle-custom-field-test_key_2')).toBeInTheDocument();
    expect(screen.getByRole('switch')).toBeChecked();
  });

  it('calls onSubmit when changing value', async () => {
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

    userEvent.click(screen.getByRole('switch'));

    await waitFor(() => {
      expect(onSubmit).toBeCalledWith({ ...customField, value: false });
    });
  });

  it('disables the toggle if the user does not have permissions', async () => {
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

    expect(screen.getByRole('switch')).toBeDisabled();
  });

  it('disables the toggle when loading', async () => {
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

    expect(screen.getByRole('switch')).toBeDisabled();
  });

  it('sets the configuration key and the initial value if the custom field is undefined', async () => {
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

    userEvent.click(screen.getByRole('switch'));

    await waitFor(() => {
      expect(onSubmit).toBeCalledWith({
        ...customField,
        key: customFieldConfiguration.key,
        /**
         * Initial value is false when the custom field is undefined.
         * By clicking to the switch it is set to true
         */
        value: true,
      });
    });
  });
});
