/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { within } from '@testing-library/react';
import { AppMockRenderer, createAppMockRenderer } from '../../../lib/test_utils';
import {
  CreateMaintenanceWindowFormProps,
  CreateMaintenanceWindowForm,
} from './create_maintenance_windows_form';
import { useUiSetting } from '@kbn/kibana-react-plugin/public';

jest.mock('@kbn/kibana-react-plugin/public/ui_settings/use_ui_setting', () => ({
  useUiSetting: jest.fn(),
}));

const formProps: CreateMaintenanceWindowFormProps = {
  onCancel: jest.fn(),
  onSuccess: jest.fn(),
};

describe('CreateMaintenanceWindowForm', () => {
  let appMockRenderer: AppMockRenderer;

  beforeEach(() => {
    jest.clearAllMocks();
    appMockRenderer = createAppMockRenderer();
    (useUiSetting as jest.Mock).mockReturnValue('America/New_York');
  });

  it('renders all form fields except the recurring form fields', async () => {
    const result = appMockRenderer.render(<CreateMaintenanceWindowForm {...formProps} />);

    expect(result.getByTestId('title-field')).toBeInTheDocument();
    expect(result.getByTestId('date-field')).toBeInTheDocument();
    expect(result.getByTestId('recurring-field')).toBeInTheDocument();
    expect(result.queryByTestId('recurring-form')).not.toBeInTheDocument();
    expect(result.queryByTestId('timezone-field')).not.toBeInTheDocument();
  });

  it('renders timezone field when the kibana setting is set to browser', async () => {
    (useUiSetting as jest.Mock).mockReturnValue('Browser');

    const result = appMockRenderer.render(<CreateMaintenanceWindowForm {...formProps} />);

    expect(result.getByTestId('title-field')).toBeInTheDocument();
    expect(result.getByTestId('date-field')).toBeInTheDocument();
    expect(result.getByTestId('recurring-field')).toBeInTheDocument();
    expect(result.queryByTestId('recurring-form')).not.toBeInTheDocument();
    expect(result.getByTestId('timezone-field')).toBeInTheDocument();
  });

  it('should initialize the form when no initialValue provided', () => {
    const result = appMockRenderer.render(<CreateMaintenanceWindowForm {...formProps} />);

    const titleInput = within(result.getByTestId('title-field')).getByTestId('input');
    const dateInputs = within(result.getByTestId('date-field')).getAllByLabelText(
      // using the aria-label to query for the date-picker input
      'Press the down key to open a popover containing a calendar.'
    );
    const recurringInput = within(result.getByTestId('recurring-field')).getByTestId('input');

    expect(titleInput).toHaveValue('');
    // except for the date field
    expect(dateInputs[0]).not.toHaveValue('');
    expect(dateInputs[1]).not.toHaveValue('');
    expect(recurringInput).not.toBeChecked();
  });

  it('should prefill the form when provided with initialValue', () => {
    const result = appMockRenderer.render(
      <CreateMaintenanceWindowForm
        {...formProps}
        initialValue={{
          title: 'test',
          startDate: '2023-03-24',
          endDate: '2023-03-26',
          timezone: ['America/Los_Angeles'],
          recurring: true,
        }}
      />
    );

    const titleInput = within(result.getByTestId('title-field')).getByTestId('input');
    const dateInputs = within(result.getByTestId('date-field')).getAllByLabelText(
      // using the aria-label to query for the date-picker input
      'Press the down key to open a popover containing a calendar.'
    );
    const recurringInput = within(result.getByTestId('recurring-field')).getByTestId('input');
    const timezoneInput = within(result.getByTestId('timezone-field')).getByTestId('input');

    expect(titleInput).toHaveValue('test');
    expect(dateInputs[0]).toHaveValue('03/23/2023 09:00 PM');
    expect(dateInputs[1]).toHaveValue('03/25/2023 09:00 PM');
    expect(recurringInput).toBeChecked();
    expect(timezoneInput).toHaveTextContent('America/Los_Angeles');
  });
});
