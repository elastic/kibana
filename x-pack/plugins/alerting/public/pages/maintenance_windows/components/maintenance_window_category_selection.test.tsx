/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, fireEvent } from '@testing-library/react';
import { MaintenanceWindowCategorySelection } from './maintenance_window_category_selection';
import { AppMockRenderer, createAppMockRenderer } from '../../../lib/test_utils';

const mockOnChange = jest.fn();

describe('maintenanceWindowCategorySelection', () => {
  let appMockRenderer: AppMockRenderer;

  beforeEach(() => {
    jest.clearAllMocks();
    appMockRenderer = createAppMockRenderer();
  });

  it('renders correctly', async () => {
    appMockRenderer.render(
      <MaintenanceWindowCategorySelection
        selectedCategories={[]}
        availableCategories={['observability', 'management', 'securitySolution']}
        onChange={mockOnChange}
      />
    );

    expect(screen.getByTestId('checkbox-observability')).not.toBeDisabled();
    expect(screen.getByTestId('checkbox-securitySolution')).not.toBeDisabled();
    expect(screen.getByTestId('checkbox-management')).not.toBeDisabled();
  });

  it('should disable options if option is not in the available categories array', () => {
    appMockRenderer.render(
      <MaintenanceWindowCategorySelection
        selectedCategories={[]}
        availableCategories={[]}
        onChange={mockOnChange}
      />
    );

    expect(screen.getByTestId('checkbox-observability')).toBeDisabled();
    expect(screen.getByTestId('checkbox-securitySolution')).toBeDisabled();
    expect(screen.getByTestId('checkbox-management')).toBeDisabled();
  });

  it('can initialize checkboxes with initial values from props', async () => {
    appMockRenderer.render(
      <MaintenanceWindowCategorySelection
        selectedCategories={['securitySolution', 'management']}
        availableCategories={['observability', 'management', 'securitySolution']}
        onChange={mockOnChange}
      />
    );

    expect(screen.getByTestId('checkbox-observability')).not.toBeChecked();
    expect(screen.getByTestId('checkbox-securitySolution')).toBeChecked();
    expect(screen.getByTestId('checkbox-management')).toBeChecked();
  });

  it('can check checkboxes', async () => {
    appMockRenderer.render(
      <MaintenanceWindowCategorySelection
        selectedCategories={['observability']}
        availableCategories={['observability', 'management', 'securitySolution']}
        onChange={mockOnChange}
      />
    );

    const managementCheckbox = screen.getByTestId('checkbox-management');
    const securityCheckbox = screen.getByTestId('checkbox-securitySolution');

    fireEvent.click(managementCheckbox);

    expect(mockOnChange).toHaveBeenLastCalledWith('management', expect.anything());

    fireEvent.click(securityCheckbox);

    expect(mockOnChange).toHaveBeenLastCalledWith('securitySolution', expect.anything());
  });

  it('should display loading spinner if isLoading is true', () => {
    appMockRenderer.render(
      <MaintenanceWindowCategorySelection
        isLoading
        selectedCategories={[]}
        availableCategories={['observability', 'management', 'securitySolution']}
        onChange={mockOnChange}
      />
    );
    expect(screen.getByTestId('maintenanceWindowCategorySelectionLoading')).toBeInTheDocument();
  });

  it('should display error message if it exists', () => {
    appMockRenderer.render(
      <MaintenanceWindowCategorySelection
        selectedCategories={[]}
        availableCategories={['observability', 'management', 'securitySolution']}
        errors={['test error']}
        onChange={mockOnChange}
      />
    );
    expect(screen.getByText('test error')).toBeInTheDocument();
  });
});
