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
import type { BasicOptions, ListOptions, TextOptions } from './field_options/config';
import { getConfig } from './field_options/config';

import type { AppMockRenderer } from '../../common/mock';
import { createAppMockRenderer } from '../../common/mock';
import { CustomFieldsForm } from './form';

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
    const config = getConfig('Text') as TextOptions; // field options config

    const checkboxOptions = [...Object.values(config)];

    expect(screen.getByTestId('custom-field-type-dropdown')).toBeInTheDocument();
    expect(screen.getByTestId('custom-field-type-Text')).toBeInTheDocument();

    const fieldOptions = screen.getByTestId('custom-field-options-checkbox-group');

    for (const option of checkboxOptions) {
      expect(within(fieldOptions).getByText(option.label)).toBeInTheDocument();
    }
  });

  it('renders custom field type options', async () => {
    appMockRender.render(<CustomFieldsForm onChange={onChange} />);

    expect(screen.getByTestId('custom-field-type-Text')).toBeInTheDocument();
    userEvent.click(screen.getByTestId('custom-field-type-dropdown'));

    await waitForEuiPopoverOpen();

    expect(screen.getByTestId('custom-field-type-List')).toBeInTheDocument();
    expect(screen.getByTestId('custom-field-type-Toggle')).toBeInTheDocument();
  });

  it('renders list custom field type', async () => {
    appMockRender.render(<CustomFieldsForm onChange={onChange} />);

    const config = getConfig('List') as ListOptions; // field options config

    const checkboxOptions = [...Object.values(config)];

    userEvent.click(screen.getByTestId('custom-field-type-dropdown'));

    await waitForEuiPopoverOpen();

    userEvent.click(screen.getByTestId('custom-field-type-List'));

    const fieldOptions = screen.getByTestId('custom-field-options-checkbox-group');

    await waitFor(() => {
      expect(screen.getByTestId('List-custom-field')).toBeInTheDocument();
    });

    for (const option of checkboxOptions) {
      expect(within(fieldOptions).getByText(option.label)).toBeInTheDocument();
    }
  });

  it('renders toggle custom field type', async () => {
    appMockRender.render(<CustomFieldsForm onChange={onChange} />);

    const config = getConfig('Toggle') as BasicOptions; // field options config

    const checkboxOptions = [...Object.values(config)];

    userEvent.click(screen.getByTestId('custom-field-type-dropdown'));

    await waitForEuiPopoverOpen();

    userEvent.click(screen.getByTestId('custom-field-type-List'));

    const fieldOptions = screen.getByTestId('custom-field-options-checkbox-group');

    await waitFor(() => {
      expect(screen.getByTestId('List-custom-field')).toBeInTheDocument();
    });

    for (const option of checkboxOptions) {
      expect(within(fieldOptions).getByText(option.label)).toBeInTheDocument();
    }
  });
});
