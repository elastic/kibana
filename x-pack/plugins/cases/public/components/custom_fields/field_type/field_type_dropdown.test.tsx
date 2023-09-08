/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import userEvent from '@testing-library/user-event';
import { screen } from '@testing-library/dom';
import { waitForEuiPopoverOpen } from '@elastic/eui/lib/test/rtl';

import type { AppMockRenderer } from '../../../common/mock';
import { createAppMockRenderer } from '../../../common/mock';
import type { CustomFieldTypesUI } from '../types';
import { FieldTypeDropdown } from './field_type_dropdown';

describe('FieldTypeDropdown', () => {
  let appMockRender: AppMockRenderer;
  const customFieldTypes: CustomFieldTypesUI[] = ['Text', 'List'];

  const props = {
    disabled: false,
    customFieldTypes,
    isLoading: false,
    onChange: jest.fn(),
    selectedType: 'Text',
  };

  beforeEach(() => {
    appMockRender = createAppMockRenderer();
    jest.clearAllMocks();
  });

  it('renders correctly', () => {
    appMockRender.render(<FieldTypeDropdown {...props} />);

    expect(screen.getByTestId('custom-field-type-dropdown')).toBeInTheDocument();
    expect(screen.getByText(props.selectedType)).toBeInTheDocument();
  });

  it('renders loading state correctly', () => {
    appMockRender.render(<FieldTypeDropdown {...{ ...props, isLoading: true }} />);

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('renders disabled state correctly', () => {
    appMockRender.render(<FieldTypeDropdown {...{ ...props, disabled: true }} />);

    expect(screen.getByTestId('custom-field-type-dropdown')).toHaveAttribute('disabled');
  });

  it('renders options correctly', async () => {
    appMockRender.render(<FieldTypeDropdown {...props} />);

    userEvent.click(screen.getByTestId('custom-field-type-dropdown'));

    await waitForEuiPopoverOpen();

    for (const type of customFieldTypes) {
      expect(screen.getAllByTestId(`custom-field-type-${type}`)[0]).toBeInTheDocument();
    }
  });

  it('changes type correctly', async () => {
    appMockRender.render(<FieldTypeDropdown {...props} />);

    userEvent.click(screen.getByTestId('custom-field-type-dropdown'));

    await waitForEuiPopoverOpen();

    userEvent.click(screen.getByTestId(`custom-field-type-${customFieldTypes[1]}`));

    expect(props.onChange).toHaveBeenCalledWith(customFieldTypes[1]);
  });
});
