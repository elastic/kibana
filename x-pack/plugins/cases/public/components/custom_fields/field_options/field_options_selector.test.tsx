/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { FieldHook } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';

import type { AppMockRenderer } from '../../../common/mock';
import { createAppMockRenderer } from '../../../common/mock';
import { CustomFieldTypes } from '../types';
import { FieldOptionsSelector } from './field_options_selector';
import * as i18n from '../translations';

describe('FieldOptionsSelector', () => {
  let appMockRender: AppMockRenderer;
  const selectedType = CustomFieldTypes.TEXT;

  const field = {
    label: 'Field options',
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
    dataTestSubj: 'custom-field-options-selector',
    disabled: false,
    field,
    isLoading: false,
    selectedType,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    appMockRender = createAppMockRenderer();
  });

  it('renders correctly', () => {
    appMockRender.render(<FieldOptionsSelector {...props} />);

    expect(screen.getByText('Field options')).toBeInTheDocument();
    expect(screen.getByTestId('custom-field-options-selector')).toBeInTheDocument();
  });

  it('toggles checkbox options correctly', async () => {
    appMockRender.render(
      <FieldOptionsSelector {...{ ...props, selectedType: 'Text' as CustomFieldTypes }} />
    );

    userEvent.click(screen.getByText(i18n.FIELD_OPTION_REQUIRED));

    expect(props.field.setValue).toHaveBeenCalledWith({ required: true });

    userEvent.click(screen.getByText(i18n.FIELD_OPTION_REQUIRED));

    expect(props.field.setValue).toHaveBeenCalledWith({ required: false });
  });
});
