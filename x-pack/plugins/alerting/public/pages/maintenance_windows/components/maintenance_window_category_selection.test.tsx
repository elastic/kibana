/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { MaintenanceWindowCategorySelection } from './maintenance_window_category_selection';
import { AppMockRenderer, createAppMockRenderer } from '../../../lib/test_utils';

const mockOnChange = jest.fn();

jest.mock('../../../utils/kibana_react');
jest.mock('../../../services/alert_api', () => ({
  loadRuleTypes: jest.fn(),
}));

const { loadRuleTypes } = jest.requireMock('../../../services/alert_api');
const { useKibana } = jest.requireMock('../../../utils/kibana_react');

describe('maintenanceWindowCategorySelection', () => {
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
      },
    });

    appMockRenderer = createAppMockRenderer();
  });

  it('renders correctly', async () => {
    appMockRenderer.render(
      <MaintenanceWindowCategorySelection selectedCategories={[]} onChange={mockOnChange} />
    );

    await waitFor(() => {
      expect(
        screen.queryByTestId('maintenanceWindowCategorySelectionLoading')
      ).not.toBeInTheDocument();
    });

    expect(screen.getByTestId('checkbox-observability')).toBeInTheDocument();
    expect(screen.getByTestId('checkbox-securitySolution')).toBeInTheDocument();
    expect(screen.getByTestId('checkbox-management')).toBeInTheDocument();
  });

  it('can initialize checkboxes with initial values from props', async () => {
    appMockRenderer.render(
      <MaintenanceWindowCategorySelection
        selectedCategories={['securitySolution', 'management']}
        onChange={mockOnChange}
      />
    );

    await waitFor(() => {
      expect(
        screen.queryByTestId('maintenanceWindowCategorySelectionLoading')
      ).not.toBeInTheDocument();
    });

    expect(screen.getByTestId('checkbox-observability')).not.toBeChecked();
    expect(screen.getByTestId('checkbox-securitySolution')).toBeChecked();
    expect(screen.getByTestId('checkbox-management')).toBeChecked();
  });

  it('can check checkboxes', async () => {
    appMockRenderer.render(
      <MaintenanceWindowCategorySelection
        selectedCategories={['observability']}
        onChange={mockOnChange}
      />
    );

    await waitFor(() => {
      expect(
        screen.queryByTestId('maintenanceWindowCategorySelectionLoading')
      ).not.toBeInTheDocument();
    });

    const managementCheckbox = screen.getByTestId('checkbox-management');
    const securityCheckbox = screen.getByTestId('checkbox-securitySolution');

    fireEvent.click(managementCheckbox);

    expect(mockOnChange).toHaveBeenLastCalledWith('management', expect.anything());

    fireEvent.click(securityCheckbox);

    expect(mockOnChange).toHaveBeenLastCalledWith('securitySolution', expect.anything());
  });

  it('disables option if user does not have the capability for a rule type', async () => {
    loadRuleTypes.mockResolvedValue([{ category: 'observability' }, { category: 'management' }]);

    appMockRenderer.render(
      <MaintenanceWindowCategorySelection
        selectedCategories={['observability']}
        onChange={mockOnChange}
      />
    );

    await waitFor(() => {
      expect(
        screen.queryByTestId('maintenanceWindowCategorySelectionLoading')
      ).not.toBeInTheDocument();
    });

    const securityCheckbox = screen.getByTestId('checkbox-securitySolution');

    expect(securityCheckbox).toBeDisabled();
  });
});
