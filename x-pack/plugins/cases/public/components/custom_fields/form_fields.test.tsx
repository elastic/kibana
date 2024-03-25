/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { AppMockRenderer } from '../../common/mock';
import { createAppMockRenderer } from '../../common/mock';
import { FormTestComponent } from '../../common/test_utils';
import { CustomFieldTypes } from '../../../common/types/domain';
import { FormFields } from './form_fields';

describe('FormFields ', () => {
  let appMockRender: AppMockRenderer;
  const onSubmit = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    appMockRender = createAppMockRenderer();
  });

  it('renders correctly', async () => {
    appMockRender.render(
      <FormTestComponent onSubmit={onSubmit}>
        <FormFields />
      </FormTestComponent>
    );

    expect(await screen.findByTestId('custom-field-label-input')).toBeInTheDocument();
    expect(await screen.findByTestId('custom-field-type-selector')).toBeInTheDocument();
  });

  it('disables field type selector on edit mode', async () => {
    appMockRender.render(
      <FormTestComponent onSubmit={onSubmit}>
        <FormFields isEditMode />
      </FormTestComponent>
    );

    expect(await screen.findByTestId('custom-field-type-selector')).toHaveAttribute('disabled');
  });

  it('submit data correctly', async () => {
    appMockRender.render(
      <FormTestComponent onSubmit={onSubmit}>
        <FormFields />
      </FormTestComponent>
    );

    fireEvent.change(await screen.findByTestId('custom-field-type-selector'), {
      target: { value: CustomFieldTypes.TOGGLE },
    });

    userEvent.type(await screen.findByTestId('custom-field-label-input'), 'hello');
    userEvent.click(await screen.findByText('Submit'));

    await waitFor(() => {
      // data, isValid
      expect(onSubmit).toBeCalledWith(
        {
          label: 'hello',
          type: CustomFieldTypes.TOGGLE,
          defaultValue: false,
        },
        true
      );
    });
  });
});
