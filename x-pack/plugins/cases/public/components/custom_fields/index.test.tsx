/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import userEvent from '@testing-library/user-event';
import { screen } from '@testing-library/dom';

import type { AppMockRenderer } from '../../common/mock';
import { createAppMockRenderer } from '../../common/mock';
import type { CustomFieldsConfiguration } from '../../../common/types/domain';
import { CustomFieldTypes } from '../../../common/types/domain';
import { CustomFields } from '.';

describe('CustomFields', () => {
  let appMockRender: AppMockRenderer;
  const customFieldsMock: CustomFieldsConfiguration = [
    {
      key: 'random_custom_key',
      label: 'Summary',
      type: CustomFieldTypes.TEXT,
      required: true,
    },
    {
      key: 'random_custom_key_2',
      label: 'Maintenance',
      type: CustomFieldTypes.TOGGLE,
      required: false,
    },
  ];

  const props = {
    disabled: false,
    isLoading: false,
    handleAddCustomField: jest.fn(),
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
    appMockRender.render(<CustomFields {...{ ...props, customFields: customFieldsMock }} />);

    expect(screen.getByTestId('add-custom-field')).toBeInTheDocument();
    expect(screen.getByTestId('droppable')).toBeInTheDocument();
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
});
