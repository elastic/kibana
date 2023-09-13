/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { FormTestComponent } from '../../common/test_utils';
import { createTextCustomFieldBuilder } from './text_field';
import type { CustomFieldBuildType } from './types';
import { getConfig } from './field_options/config';

describe('createTextCustomFieldBuilder ', () => {
  const onSubmit = jest.fn();
  const builder = createTextCustomFieldBuilder({
    customFieldType: 'Text',
  });

  const createdCustomField = builder.build();

  const { customFieldType, fieldOptions } = createdCustomField[0] as CustomFieldBuildType;

  const config = getConfig('Text'); // field options config

  const checkboxOptions = [...Object.values(config)];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly', async () => {
    render(
      <FormTestComponent onSubmit={onSubmit}>
        {customFieldType}
        {fieldOptions}
      </FormTestComponent>
    );

    // fieldOptions
    expect(screen.getByTestId('custom-field-options')).toBeInTheDocument();

    for (const option of checkboxOptions) {
      expect(screen.getByText(option.label)).toBeInTheDocument();
    }
  });

  it('updates field options correctly', async () => {
    render(
      <FormTestComponent onSubmit={onSubmit}>
        {customFieldType}
        {fieldOptions}
      </FormTestComponent>
    );

    userEvent.click(screen.getByText(checkboxOptions[0].label));
    userEvent.click(screen.getByText(checkboxOptions[1].label));

    userEvent.click(screen.getByText('Submit'));

    await waitFor(() => {
      // data, isValid
      expect(onSubmit).toBeCalledWith(
        {
          fieldOptions: {
            required_option: true,
            multiple_values: true,
          },
        },
        true
      );
    });
  });
});
