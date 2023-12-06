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
      <RuleFormConsumerSelection
        selectedConsumer={null}
        consumers={mockConsumers}
        onChange={mockOnChange}
        errors={{}}
      />
    );

    expect(screen.getByTestId('ruleFormConsumerSelect')).toBeInTheDocument();
    expect(screen.getByText('Select a scope')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('comboBoxToggleListButton'));
    expect(screen.getByText('Logs')).toBeInTheDocument();
    expect(screen.getByText('Metrics')).toBeInTheDocument();
    expect(screen.getByText('Stack Rules')).toBeInTheDocument();
  });

  it('should be able to select infrastructure and call onChange', () => {
    render(
      <RuleFormConsumerSelection
        selectedConsumer={null}
        consumers={mockConsumers}
        onChange={mockOnChange}
        errors={{}}
      />
    );

    fireEvent.click(screen.getByTestId('comboBoxToggleListButton'));
    fireEvent.click(screen.getByTestId('infrastructure'));
    expect(mockOnChange).toHaveBeenLastCalledWith('infrastructure');
  });

  it('should be able to select logs and call onChange', () => {
    render(
      <RuleFormConsumerSelection
        selectedConsumer={null}
        consumers={mockConsumers}
        onChange={mockOnChange}
        errors={{}}
      />
    );

    fireEvent.click(screen.getByTestId('comboBoxToggleListButton'));
    fireEvent.click(screen.getByTestId('logs'));
    expect(mockOnChange).toHaveBeenLastCalledWith('logs');
  });

  it('should be able to show errors when there is one', () => {
    render(
      <RuleFormConsumerSelection
        selectedConsumer={null}
        consumers={mockConsumers}
        onChange={mockOnChange}
        errors={{ consumer: ['Scope is required'] }}
      />
    );
    expect(screen.queryAllByText('Scope is required')).toHaveLength(1);
  });

  it('should display nothing if there is only 1 consumer to select', () => {
    render(
      <RuleFormConsumerSelection
        selectedConsumer={null}
        consumers={['stackAlerts']}
        onChange={mockOnChange}
        errors={{}}
      />
    );

    expect(mockOnChange).toHaveBeenLastCalledWith('stackAlerts');
    expect(screen.queryByTestId('ruleFormConsumerSelect')).not.toBeInTheDocument();
  });

  it('should display nothing if observability is one of the consumers', () => {
    render(
      <RuleFormConsumerSelection
        selectedConsumer={null}
        consumers={['logs', 'observability']}
        onChange={mockOnChange}
        errors={{}}
      />
    );

    expect(screen.queryByTestId('ruleFormConsumerSelect')).not.toBeInTheDocument();
  });

  it('should display the initial selected consumer', () => {
    render(
      <RuleFormConsumerSelection
        selectedConsumer={'logs'}
        consumers={mockConsumers}
        onChange={mockOnChange}
        errors={{}}
      />
    );

    expect(screen.getByText('Logs')).toBeInTheDocument();
    expect(() => screen.getByText('Select a scope')).toThrow();
  });

  it('should not display the initial selected consumer if it is not a selectable option', () => {
    render(
      <RuleFormConsumerSelection
        selectedConsumer={'logs'}
        consumers={['stackAlerts', 'infrastructure']}
        onChange={mockOnChange}
        errors={{}}
      />
    );
    expect(() => screen.getByText('Logs')).toThrow();
    expect(screen.getByText('Select a scope')).toBeInTheDocument();
  });
});
