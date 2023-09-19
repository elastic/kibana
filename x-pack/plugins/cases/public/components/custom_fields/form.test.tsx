/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { waitForEuiPopoverOpen } from '@elastic/eui/lib/test/rtl';

import type { AppMockRenderer } from '../../common/mock';
import { createAppMockRenderer } from '../../common/mock';
import { CustomFieldsForm } from './form';
import * as i18n from './translations';

describe('CustomFieldsForm ', () => {
  let appMockRender: AppMockRenderer;
  const onChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    appMockRender = createAppMockRenderer();
  });

  it('renders correctly', async () => {
    appMockRender.render(<CustomFieldsForm onChange={onChange} />);

    expect(screen.getByTestId('custom-field-label-input')).toBeInTheDocument();
    expect(screen.getByTestId('custom-field-type-selector')).toBeInTheDocument();
  });

  it('renders text as default custom field type', async () => {
    appMockRender.render(<CustomFieldsForm onChange={onChange} />);

    expect(screen.getByTestId('custom-field-type-dropdown')).toBeInTheDocument();
    expect(screen.getByTestId('custom-field-type-text')).toBeInTheDocument();

    const fieldOptions = screen.getByTestId('custom-field-options-checkbox-group');

    expect(within(fieldOptions).getByText(i18n.FIELD_OPTION_REQUIRED)).toBeInTheDocument();
  });

  it('renders custom field type options', async () => {
    appMockRender.render(<CustomFieldsForm onChange={onChange} />);

    expect(screen.getByTestId('custom-field-type-text')).toBeInTheDocument();
    userEvent.click(screen.getByTestId('custom-field-type-dropdown'));

    await waitForEuiPopoverOpen();

    expect(screen.getByTestId('custom-field-type-toggle')).toBeInTheDocument();
  });

  it('renders toggle custom field type', async () => {
    appMockRender.render(<CustomFieldsForm onChange={onChange} />);

    userEvent.click(screen.getByTestId('custom-field-type-dropdown'));

    await waitForEuiPopoverOpen();

    userEvent.click(screen.getByTestId('custom-field-type-toggle'));

    const fieldOptions = screen.getByTestId('custom-field-options-checkbox-group');

    await waitFor(() => {
      expect(screen.getByTestId('toggle-custom-field-options')).toBeInTheDocument();
    });

    expect(within(fieldOptions).getByText(i18n.FIELD_OPTION_REQUIRED)).toBeInTheDocument();
  });
});
