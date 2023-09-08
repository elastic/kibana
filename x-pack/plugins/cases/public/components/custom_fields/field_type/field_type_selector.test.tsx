/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { waitForEuiPopoverOpen } from '@elastic/eui/lib/test/rtl';
import type { FieldHook } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';

import type { AppMockRenderer } from '../../../common/mock';
import { createAppMockRenderer } from '../../../common/mock';
import type { CustomFieldTypesUI } from '../types';
import { FieldTypeSelector } from './field_type_selector';

describe('FieldTypeSelector', () => {
  let appMockRender: AppMockRenderer;
  const customFieldTypes: CustomFieldTypesUI[] = ['Text', 'List', 'Toggle'];

  const field = {
    label: 'Field Type',
    helpText: '',
    type: '',
    value: 'Text',
    errors: [],
    onChange: jest.fn(),
    setValue: jest.fn(),
    setErrors: jest.fn(),
    reset: jest.fn(),
  } as unknown as FieldHook<string>;

  const props = {
    customFieldTypes,
    dataTestSubj: 'custom-field-type-selector',
    disabled: false,
    field,
    isLoading: false,
    handleChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    appMockRender = createAppMockRenderer();
  });

  it('renders correctly', () => {
    appMockRender.render(<FieldTypeSelector {...props} />);

    expect(screen.getByText('Field Type')).toBeInTheDocument();
    expect(screen.getByTestId('custom-field-type-selector')).toBeInTheDocument();
  });

  it('sets value correctly', async () => {
    appMockRender.render(<FieldTypeSelector {...props} />);

    userEvent.click(screen.getByTestId('custom-field-type-dropdown'));

    await waitForEuiPopoverOpen();

    userEvent.click(screen.getByTestId(`custom-field-type-${customFieldTypes[1]}`));

    await waitFor(() => {
      expect(props.field.setValue).toBeCalledWith(customFieldTypes[1]);
      expect(props.handleChange).toBeCalledWith(customFieldTypes[1]);
    });
  });
});
