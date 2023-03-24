/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { within } from '@testing-library/react';
import { AppMockRenderer, createAppMockRenderer } from '../../../lib/test_utils';
import { CreateMaintenanceWindowFormProps, CreateMaintenanceWindowForm } from './form';

const formProps: CreateMaintenanceWindowFormProps = {
  onCancel: jest.fn(),
  onSuccess: jest.fn(),
};

describe('CreateMaintenanceWindowForm', () => {
  let appMockRenderer: AppMockRenderer;

  beforeEach(() => {
    jest.clearAllMocks();
    appMockRenderer = createAppMockRenderer();
  });

  it('renders all form fields except the recurring form fields', async () => {
    const result = appMockRenderer.render(<CreateMaintenanceWindowForm {...formProps} />);

    expect(result.getByTestId('title-field')).toBeInTheDocument();
    expect(result.getByTestId('date-field')).toBeInTheDocument();
    expect(result.getByTestId('duration-field')).toBeInTheDocument();
    expect(result.getByTestId('recurring-field')).toBeInTheDocument();
    expect(result.queryByTestId('recurring-form')).not.toBeInTheDocument();
  });

  it('should initialize the form when no initialValue provided', () => {
    const result = appMockRenderer.render(<CreateMaintenanceWindowForm {...formProps} />);

    const titleInput = within(result.getByTestId('title-field')).getByTestId('input');
    const dateInput = within(result.getByTestId('date-field')).getByLabelText(
      // using the aria-label to query for the date-picker input
      'Press the down key to open a popover containing a calendar.'
    );
    const durationInput = within(result.getByTestId('duration-field')).getByTestId('input');
    const recurringInput = within(result.getByTestId('recurring-field')).getByTestId('input');

    expect(titleInput).toHaveValue('');
    // except for the date field
    expect(dateInput).not.toHaveValue('');
    expect(durationInput).toHaveValue(null);
    expect(recurringInput).not.toBeChecked();
  });

  it('should prefill the form when provided with initialValue', () => {
    const result = appMockRenderer.render(
      <CreateMaintenanceWindowForm
        {...formProps}
        initialValue={{ title: 'test', date: '2023-03-24', duration: 1, recurring: true }}
      />
    );

    const titleInput = within(result.getByTestId('title-field')).getByTestId('input');
    const dateInput = within(result.getByTestId('date-field')).getByLabelText(
      // using the aria-label to query for the date-picker input
      'Press the down key to open a popover containing a calendar.'
    );
    const durationInput = within(result.getByTestId('duration-field')).getByTestId('input');
    const recurringInput = within(result.getByTestId('recurring-field')).getByTestId('input');

    expect(titleInput).toHaveValue('test');
    expect(dateInput).toHaveValue('03/24/2023 12:00 AM');
    expect(durationInput).toHaveValue(1);
    expect(recurringInput).toBeChecked();
  });
});
