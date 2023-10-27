/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { RuleFormConsumerSelection } from './rule_form_consumer_selection';
import { RuleCreationValidConsumer } from '../../../types';

const mockConsumers: RuleCreationValidConsumer[] = ['logs', 'infrastructure', 'stackAlerts'];

const mockOnChange = jest.fn();

describe('RuleFormConsumerSelectionModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly', async () => {
    render(
      <RuleFormConsumerSelection consumers={mockConsumers} onChange={mockOnChange} errors={{}} />
    );

    expect(screen.getByTestId('ruleFormConsumerSelect')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('comboBoxToggleListButton'));
    expect(screen.getByText('Logs')).toBeInTheDocument();
    expect(screen.getByText('Metrics')).toBeInTheDocument();
    expect(screen.getByText('Stack Rules')).toBeInTheDocument();
  });

  it('should initialize dropdown to null', () => {
    render(
      <RuleFormConsumerSelection consumers={mockConsumers} onChange={mockOnChange} errors={{}} />
    );

    // Selects first option if no initial value is provided
    expect(mockOnChange).toHaveBeenLastCalledWith(null);
    mockOnChange.mockClear();
  });

  it('should be able to select infrastructure and call onChange', () => {
    render(
      <RuleFormConsumerSelection consumers={mockConsumers} onChange={mockOnChange} errors={{}} />
    );

    fireEvent.click(screen.getByTestId('comboBoxToggleListButton'));
    fireEvent.click(screen.getByTestId('infrastructure'));
    expect(mockOnChange).toHaveBeenLastCalledWith('infrastructure');
  });

  it('should be able to select logs and call onChange', () => {
    render(
      <RuleFormConsumerSelection consumers={mockConsumers} onChange={mockOnChange} errors={{}} />
    );

    fireEvent.click(screen.getByTestId('comboBoxToggleListButton'));
    fireEvent.click(screen.getByTestId('logs'));
    expect(mockOnChange).toHaveBeenLastCalledWith('logs');
  });

  it('should be able to show errors when there is one', () => {
    render(
      <RuleFormConsumerSelection
        consumers={mockConsumers}
        onChange={mockOnChange}
        errors={{ consumer: ['Scope is required'] }}
      />
    );
    expect(screen.queryAllByText('Scope is required')).toHaveLength(1);
  });

  it('should display nothing if there is only 1 consumer to select', () => {
    render(
      <RuleFormConsumerSelection consumers={['stackAlerts']} onChange={mockOnChange} errors={{}} />
    );

    expect(mockOnChange).toHaveBeenLastCalledWith('stackAlerts');
    expect(screen.queryByTestId('ruleFormConsumerSelect')).not.toBeInTheDocument();
  });
});
