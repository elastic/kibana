/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import userEvent from '@testing-library/user-event';
import { screen, within } from '@testing-library/dom';

import type { AppMockRenderer } from '../../../common/mock';
import { createAppMockRenderer } from '../../../common/mock';
import { CustomFieldTypes } from '../types';
import { FieldOptions } from '.';
import { getConfig } from './config';
import * as i18n from '../translations';

describe('FieldOptions', () => {
  let appMockRender: AppMockRenderer;
  const selectedType = CustomFieldTypes.TEXT;

  const props = {
    disabled: false,
    handleOptionChange: jest.fn(),
    selectedType,
  };

  beforeEach(() => {
    appMockRender = createAppMockRenderer();
    jest.clearAllMocks();
  });

  it('renders correctly', () => {
    appMockRender.render(<FieldOptions {...props} />);

    expect(screen.getByTestId('custom-field-options-checkbox-group')).toBeInTheDocument();
  });

  it('renders disabled state correctly', () => {
    appMockRender.render(<FieldOptions {...{ ...props, disabled: true }} />);

    const checkboxGroup = screen.getByTestId('custom-field-options-checkbox-group');

    expect(within(checkboxGroup).getAllByRole('checkbox')[0]).toHaveAttribute('disabled');
  });

  it.each([CustomFieldTypes.TEXT, CustomFieldTypes.TOGGLE])(
    'renders options for %s correctly',
    async (customFieldType) => {
      appMockRender.render(
        <FieldOptions {...{ ...props, selectedType: customFieldType as CustomFieldTypes }} />
      );

      const config = getConfig(customFieldType as CustomFieldTypes);

      const checkboxOptions = [...Object.values(config)];

      expect(screen.getByTestId('custom-field-options-checkbox-group')).toBeInTheDocument();

      for (const option of checkboxOptions) {
        expect(screen.getByText(option.label)).toBeInTheDocument();
      }
    }
  );

  it('toggles checkbox options correctly', async () => {
    appMockRender.render(<FieldOptions {...props} />);

    userEvent.click(screen.getByText(i18n.FIELD_OPTION_REQUIRED));

    expect(props.handleOptionChange).toHaveBeenCalledWith({ required: true });

    userEvent.click(screen.getByText(i18n.FIELD_OPTION_REQUIRED));

    expect(props.handleOptionChange).toHaveBeenCalledWith({
      required: false,
    });
  });
});
