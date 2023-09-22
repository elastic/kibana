/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MaintenanceWindowSolutionSelection } from './maintenance_window_solution_selection';

const mockOnChange = jest.fn();

describe('maintenanceWindowSolutionSelection', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly', () => {
    render(<MaintenanceWindowSolutionSelection selectedCategories={[]} onChange={mockOnChange} />);

    expect(screen.getByTestId('checkbox-kibana')).toBeInTheDocument();
    expect(screen.getByTestId('checkbox-observability')).toBeInTheDocument();
    expect(screen.getByTestId('checkbox-securitySolution')).toBeInTheDocument();
    expect(screen.getByTestId('checkbox-management')).toBeInTheDocument();
  });

  it('can initialize checkboxes with initial values from props', () => {
    render(
      <MaintenanceWindowSolutionSelection
        selectedCategories={['securitySolution', 'management']}
        onChange={mockOnChange}
      />
    );

    expect(screen.getByTestId('checkbox-kibana')).not.toBeChecked();
    expect(screen.getByTestId('checkbox-observability')).not.toBeChecked();
    expect(screen.getByTestId('checkbox-securitySolution')).toBeChecked();
    expect(screen.getByTestId('checkbox-management')).toBeChecked();
  });

  it('can check checkboxes', () => {
    render(
      <MaintenanceWindowSolutionSelection selectedCategories={['kibana']} onChange={mockOnChange} />
    );

    const managementCheckbox = screen.getByTestId('checkbox-management');
    const kibanaCheckbox = screen.getByTestId('checkbox-kibana');

    fireEvent.click(managementCheckbox);

    expect(mockOnChange).toHaveBeenLastCalledWith('management', expect.anything());

    fireEvent.click(kibanaCheckbox);

    expect(mockOnChange).toHaveBeenLastCalledWith('kibana', expect.anything());
  });
});
