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

    expect(screen.getByTestId('option-observability')).not.toBeDisabled();
    expect(screen.getByTestId('option-securitySolution')).not.toBeDisabled();
    expect(screen.getByTestId('option-management')).not.toBeDisabled();
  });

  it('should disable options if option is not in the available categories array', () => {
    appMockRenderer.render(
      <MaintenanceWindowCategorySelection
        selectedCategories={[]}
        availableCategories={[]}
        onChange={mockOnChange}
      />
    );

    expect(screen.getByTestId('option-observability')).toBeDisabled();
    expect(screen.getByTestId('option-securitySolution')).toBeDisabled();
    expect(screen.getByTestId('option-management')).toBeDisabled();
  });

  it('can initialize checkboxes with initial values from props', async () => {
    appMockRenderer.render(
      <MaintenanceWindowCategorySelection
        selectedCategories={['securitySolution', 'management']}
        availableCategories={['observability', 'management', 'securitySolution']}
        onChange={mockOnChange}
      />
    );

    expect(screen.getByTestId('option-observability')).not.toBeChecked();
    expect(screen.getByTestId('option-securitySolution')).toBeChecked();
    expect(screen.getByTestId('option-management')).toBeChecked();
  });

  it('can check checkboxes', async () => {
    appMockRenderer.render(
      <MaintenanceWindowCategorySelection
        selectedCategories={['observability']}
        availableCategories={['observability', 'management', 'securitySolution']}
        onChange={mockOnChange}
      />
    );

    const managementCheckbox = screen.getByTestId('option-management');
    const securityCheckbox = screen.getByTestId('option-securitySolution');

    fireEvent.click(managementCheckbox);

    expect(mockOnChange).toHaveBeenLastCalledWith(['observability', 'management']);

    fireEvent.click(securityCheckbox);

    expect(mockOnChange).toHaveBeenLastCalledWith(['observability', 'securitySolution']);
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

  it('should display radio group if scoped query is enabled', () => {
    appMockRenderer.render(
      <MaintenanceWindowCategorySelection
        isScopedQueryEnabled={false}
        selectedCategories={[]}
        availableCategories={['observability', 'management', 'securitySolution']}
        onChange={mockOnChange}
      />
    );

    expect(
      screen.getByTestId('maintenanceWindowCategorySelectionCheckboxGroup')
    ).toBeInTheDocument();

    appMockRenderer.render(
      <MaintenanceWindowCategorySelection
        isScopedQueryEnabled={true}
        selectedCategories={[]}
        availableCategories={['observability', 'management', 'securitySolution']}
        onChange={mockOnChange}
      />
    );

    expect(screen.getByTestId('maintenanceWindowCategorySelectionRadioGroup')).toBeInTheDocument();
  });

  it('should set only 1 category at a time if scoped query is enabled', () => {
    appMockRenderer.render(
      <MaintenanceWindowCategorySelection
        isScopedQueryEnabled={true}
        selectedCategories={[]}
        availableCategories={['observability', 'management', 'securitySolution']}
        onChange={mockOnChange}
      />
    );

    let managementCheckbox = screen.getByLabelText('Stack rules');

    fireEvent.click(managementCheckbox);

    expect(mockOnChange).toHaveBeenLastCalledWith(['management']);

    appMockRenderer.render(
      <MaintenanceWindowCategorySelection
        isScopedQueryEnabled={true}
        selectedCategories={['observability']}
        availableCategories={['observability', 'management', 'securitySolution']}
        onChange={mockOnChange}
      />
    );

    managementCheckbox = screen.getByLabelText('Stack rules');

    fireEvent.click(managementCheckbox);

    expect(mockOnChange).toHaveBeenLastCalledWith(['management']);
  });
});
