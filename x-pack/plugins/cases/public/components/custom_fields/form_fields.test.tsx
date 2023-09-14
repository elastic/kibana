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

import type { AppMockRenderer } from '../../common/mock';
import { createAppMockRenderer } from '../../common/mock';
import { FormTestComponent } from '../../common/test_utils';
import { FormFields } from './form_fields';
import { customFieldTypesValues } from './schema';
import { MAX_CUSTOM_FIELD_LABEL_LENGTH } from '../../../common/constants';

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

    expect(screen.getByTestId('custom-field-label-input')).toBeInTheDocument();
    expect(screen.getByTestId('custom-field-type-selector')).toBeInTheDocument();
  });

  it('submit data correctly', async () => {
    appMockRender.render(
      <FormTestComponent onSubmit={onSubmit}>
        <FormFields />
      </FormTestComponent>
    );

    userEvent.type(screen.getByTestId('custom-field-label-input'), 'hello');

    userEvent.click(screen.getByTestId('custom-field-type-dropdown'));

    await waitForEuiPopoverOpen();

    userEvent.click(screen.getByTestId(`custom-field-type-${customFieldTypesValues[1]}`));

    userEvent.click(screen.getByText('Submit'));

    await waitFor(() => {
      // data, isValid
      expect(onSubmit).toBeCalledWith(
        {
          fieldLabel: 'hello',
          fieldType: 'toggle',
        },
        true
      );
    });
  });
});
