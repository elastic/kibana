/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import userEvent from '@testing-library/user-event';
import { screen, waitFor } from '@testing-library/react';

import type { AppMockRenderer } from '../../common/mock';
import { createAppMockRenderer } from '../../common/mock';
import { customFieldsConfigurationMock } from '../../containers/mock';
import { CustomFieldTypes } from '../../../common/types/domain';
import { MAX_CUSTOM_FIELDS_PER_CASE } from '../../../common/constants';
import { CustomFields } from '.';
import * as i18n from './translations';

describe('CustomFields', () => {
  let appMockRender: AppMockRenderer;

  const props = {
    disabled: false,
    isLoading: false,
    handleAddCustomField: jest.fn(),
    handleDeleteCustomField: jest.fn(),
    handleEditCustomField: jest.fn(),
    customFields: [],
  };

  beforeEach(() => {
    appMockRender = createAppMockRenderer();
    jest.clearAllMocks();
  });

  it('renders correctly', () => {
    appMockRender.render(<CustomFields {...props} />);

    expect(screen.getByTestId('custom-fields-form-group')).toBeInTheDocument();
    expect(screen.getByTestId('add-custom-field')).toBeInTheDocument();
  });

  it('renders custom fields correctly', () => {
    appMockRender.render(
      <CustomFields {...{ ...props, customFields: customFieldsConfigurationMock }} />
    );

    expect(screen.getByTestId('add-custom-field')).toBeInTheDocument();
    expect(screen.getByTestId('custom-fields-list')).toBeInTheDocument();
  });

  it('renders loading state correctly', () => {
    appMockRender.render(<CustomFields {...{ ...props, isLoading: true }} />);

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('renders disabled state correctly', () => {
    appMockRender.render(<CustomFields {...{ ...props, disabled: true }} />);

    expect(screen.getByTestId('add-custom-field')).toHaveAttribute('disabled');
  });

  it('calls onChange on add option click', async () => {
    appMockRender.render(<CustomFields {...props} />);

    userEvent.click(screen.getByTestId('add-custom-field'));

    expect(props.handleAddCustomField).toBeCalled();
  });

  it('calls handleEditCustomField on edit option click', async () => {
    appMockRender.render(
      <CustomFields {...{ ...props, customFields: customFieldsConfigurationMock }} />
    );

    userEvent.click(
      screen.getByTestId(`${customFieldsConfigurationMock[0].key}-custom-field-edit`)
    );

    expect(props.handleEditCustomField).toBeCalledWith(customFieldsConfigurationMock[0].key);
  });

  it('shows the experimental badge', () => {
    appMockRender.render(<CustomFields {...props} />);

    expect(screen.getByTestId('case-experimental-badge')).toBeInTheDocument();
  });

  it('shows error when custom fields reaches the limit', async () => {
    const generatedMockCustomFields = [];

    for (let i = 0; i < 8; i++) {
      generatedMockCustomFields.push({
        key: `field_key_${i + 1}`,
        label: `My custom label ${i + 1}`,
        type: CustomFieldTypes.TEXT,
        required: false,
      });
    }
    const customFields = [...customFieldsConfigurationMock, ...generatedMockCustomFields];

    appMockRender.render(<CustomFields {...{ ...props, customFields }} />);

    userEvent.click(screen.getByTestId('add-custom-field'));

    await waitFor(() => {
      expect(screen.getByText(i18n.MAX_CUSTOM_FIELD_LIMIT(MAX_CUSTOM_FIELDS_PER_CASE)));
      expect(screen.getByTestId('add-custom-field')).toHaveAttribute('disabled');
    });
  });
});
