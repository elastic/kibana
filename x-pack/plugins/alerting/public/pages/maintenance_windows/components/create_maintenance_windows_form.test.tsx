/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { within, fireEvent, waitFor } from '@testing-library/react';
import { AppMockRenderer, createAppMockRenderer } from '../../../lib/test_utils';
import {
  CreateMaintenanceWindowFormProps,
  CreateMaintenanceWindowForm,
} from './create_maintenance_windows_form';

jest.mock('../../../utils/kibana_react');
jest.mock('../../../services/rule_api', () => ({
  loadRuleTypes: jest.fn(),
}));

const { loadRuleTypes } = jest.requireMock('../../../services/rule_api');
const { useKibana, useUiSetting } = jest.requireMock('../../../utils/kibana_react');

const formProps: CreateMaintenanceWindowFormProps = {
  onCancel: jest.fn(),
  onSuccess: jest.fn(),
};

describe('CreateMaintenanceWindowForm', () => {
  let appMockRenderer: AppMockRenderer;

  beforeEach(() => {
    jest.clearAllMocks();
    loadRuleTypes.mockResolvedValue([
      { category: 'observability' },
      { category: 'management' },
      { category: 'securitySolution' },
    ]);

    useKibana.mockReturnValue({
      services: {
        notifications: {
          toasts: {
            addSuccess: jest.fn(),
            addDanger: jest.fn(),
          },
        },
        unifiedSearch: {
          ui: {
            SearchBar: <div />,
          },
        },
      },
    });

    useUiSetting.mockReturnValue('America/New_York');
    appMockRenderer = createAppMockRenderer();
  });

  it('renders all form fields except the recurring form fields', async () => {
    const result = appMockRenderer.render(<CreateMaintenanceWindowForm {...formProps} />);

    await waitFor(() => {
      expect(
        result.queryByTestId('maintenanceWindowCategorySelectionLoading')
      ).not.toBeInTheDocument();
    });

    expect(result.getByTestId('title-field')).toBeInTheDocument();
    expect(result.getByTestId('date-field')).toBeInTheDocument();
    expect(result.getByTestId('recurring-field')).toBeInTheDocument();
    expect(result.getByTestId('maintenanceWindowCategorySelection')).toBeInTheDocument();
    expect(result.queryByTestId('recurring-form')).not.toBeInTheDocument();
    expect(result.queryByTestId('timezone-field')).not.toBeInTheDocument();
  });

  it('renders timezone field when the kibana setting is set to browser', async () => {
    useUiSetting.mockReturnValue('Browser');

    const result = appMockRenderer.render(<CreateMaintenanceWindowForm {...formProps} />);

    await waitFor(() => {
      expect(
        result.queryByTestId('maintenanceWindowCategorySelectionLoading')
      ).not.toBeInTheDocument();
    });

    expect(result.getByTestId('title-field')).toBeInTheDocument();
    expect(result.getByTestId('date-field')).toBeInTheDocument();
    expect(result.getByTestId('recurring-field')).toBeInTheDocument();
    expect(result.getByTestId('maintenanceWindowCategorySelection')).toBeInTheDocument();
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

  it('should prefill the form when provided with initialValue', async () => {
    const result = appMockRenderer.render(
      <CreateMaintenanceWindowForm
        {...formProps}
        initialValue={{
          title: 'test',
          startDate: '2023-03-24',
          endDate: '2023-03-26',
          timezone: ['America/Los_Angeles'],
          recurring: true,
          categoryIds: [],
        }}
      />
    );

    const titleInput = within(result.getByTestId('title-field')).getByTestId('input');
    const dateInputs = within(result.getByTestId('date-field')).getAllByLabelText(
      // using the aria-label to query for the date-picker input
      'Press the down key to open a popover containing a calendar.'
    );
    const recurringInput = within(result.getByTestId('recurring-field')).getByTestId('input');
    const timezoneInput = within(result.getByTestId('timezone-field')).getByTestId(
      'comboBoxSearchInput'
    );

    await waitFor(() => {
      expect(
        result.queryByTestId('maintenanceWindowCategorySelectionLoading')
      ).not.toBeInTheDocument();
    });

    const observabilityInput = within(
      result.getByTestId('maintenanceWindowCategorySelection')
    ).getByTestId('option-observability');
    const securityInput = within(
      result.getByTestId('maintenanceWindowCategorySelection')
    ).getByTestId('option-securitySolution');
    const managementInput = within(
      result.getByTestId('maintenanceWindowCategorySelection')
    ).getByTestId('option-management');

    expect(observabilityInput).toBeChecked();
    expect(securityInput).toBeChecked();
    expect(managementInput).toBeChecked();
    expect(titleInput).toHaveValue('test');
    expect(dateInputs[0]).toHaveValue('03/23/2023 09:00 PM');
    expect(dateInputs[1]).toHaveValue('03/25/2023 09:00 PM');
    expect(recurringInput).toBeChecked();
    expect(timezoneInput).toHaveValue('America/Los_Angeles');
  });

  it('should initialize MWs without category ids properly', async () => {
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

    await waitFor(() => {
      expect(
        result.queryByTestId('maintenanceWindowCategorySelectionLoading')
      ).not.toBeInTheDocument();
    });

    const observabilityInput = within(
      result.getByTestId('maintenanceWindowCategorySelection')
    ).getByTestId('option-observability');
    const securityInput = within(
      result.getByTestId('maintenanceWindowCategorySelection')
    ).getByTestId('option-securitySolution');
    const managementInput = within(
      result.getByTestId('maintenanceWindowCategorySelection')
    ).getByTestId('option-management');

    expect(observabilityInput).toBeChecked();
    expect(securityInput).toBeChecked();
    expect(managementInput).toBeChecked();
  });

  it('should initialize MWs with selected category ids properly', async () => {
    const result = appMockRenderer.render(
      <CreateMaintenanceWindowForm
        {...formProps}
        initialValue={{
          title: 'test',
          startDate: '2023-03-24',
          endDate: '2023-03-26',
          timezone: ['America/Los_Angeles'],
          recurring: true,
          categoryIds: ['observability', 'management'],
        }}
        maintenanceWindowId="test"
      />
    );

    await waitFor(() => {
      expect(
        result.queryByTestId('maintenanceWindowCategorySelectionLoading')
      ).not.toBeInTheDocument();
    });

    const observabilityInput = within(
      result.getByTestId('maintenanceWindowCategorySelection')
    ).getByTestId('option-observability');
    const securityInput = within(
      result.getByTestId('maintenanceWindowCategorySelection')
    ).getByTestId('option-securitySolution');
    const managementInput = within(
      result.getByTestId('maintenanceWindowCategorySelection')
    ).getByTestId('option-management');

    expect(observabilityInput).toBeChecked();
    expect(managementInput).toBeChecked();
    expect(securityInput).not.toBeChecked();
  });

  it('can select category IDs', async () => {
    const result = appMockRenderer.render(<CreateMaintenanceWindowForm {...formProps} />);

    await waitFor(() => {
      expect(
        result.queryByTestId('maintenanceWindowCategorySelectionLoading')
      ).not.toBeInTheDocument();
    });

    const observabilityInput = within(
      result.getByTestId('maintenanceWindowCategorySelection')
    ).getByTestId('option-observability');
    const securityInput = within(
      result.getByTestId('maintenanceWindowCategorySelection')
    ).getByTestId('option-securitySolution');
    const managementInput = within(
      result.getByTestId('maintenanceWindowCategorySelection')
    ).getByTestId('option-management');

    expect(observabilityInput).toBeChecked();
    expect(securityInput).toBeChecked();
    expect(managementInput).toBeChecked();

    fireEvent.click(observabilityInput);

    expect(observabilityInput).not.toBeChecked();
    expect(securityInput).toBeChecked();
    expect(managementInput).toBeChecked();

    fireEvent.click(securityInput);
    fireEvent.click(observabilityInput);

    expect(observabilityInput).toBeChecked();
    expect(securityInput).not.toBeChecked();
    expect(managementInput).toBeChecked();
  });
});
