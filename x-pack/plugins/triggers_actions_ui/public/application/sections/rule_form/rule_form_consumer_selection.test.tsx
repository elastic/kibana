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
        selectedConsumers={null}
        consumers={mockConsumers}
        onChange={mockOnChange}
        errors={{}}
      />
    );

    expect(await screen.findByTestId('ruleFormConsumerSelect')).toBeInTheDocument();
    expect(await screen.findByTestId('comboBoxSearchInput')).toHaveAttribute(
      'placeholder',
      'Select a scope'
    );
    expect(await screen.findByTestId('comboBoxSearchInput')).toHaveValue('');
    fireEvent.click(await screen.findByTestId('comboBoxToggleListButton'));
    expect(await screen.findByText('Logs')).toBeInTheDocument();
    expect(await screen.findByText('Metrics')).toBeInTheDocument();
    expect(await screen.findByText('Stack Rules')).toBeInTheDocument();
  });

  it('should initialize to all valid consumers', () => {
    render(
      <RuleFormConsumerSelection
        selectedConsumers={null}
        consumers={['logs', 'infrastructure']}
        onChange={mockOnChange}
        errors={{}}
      />
    );
    expect(mockOnChange).toHaveBeenLastCalledWith(['logs', 'infrastructure']);
  });

  it('should be able to select infrastructure and call onChange', async () => {
    render(
      <RuleFormConsumerSelection
        selectedConsumers={null}
        consumers={mockConsumers}
        onChange={mockOnChange}
        errors={{}}
      />
    );

    fireEvent.click(await screen.findByTestId('comboBoxToggleListButton'));
    fireEvent.click(await screen.findByTestId('infrastructure'));
    expect(mockOnChange).toHaveBeenLastCalledWith(['infrastructure']);
  });

  it('should be able to select logs and call onChange', async () => {
    render(
      <RuleFormConsumerSelection
        selectedConsumers={null}
        consumers={mockConsumers}
        onChange={mockOnChange}
        errors={{}}
      />
    );

    fireEvent.click(await screen.findByTestId('comboBoxToggleListButton'));
    fireEvent.click(await screen.findByTestId('logs'));
    expect(mockOnChange).toHaveBeenLastCalledWith(['logs']);
  });

  it('should be able to show errors when there is one', () => {
    render(
      <RuleFormConsumerSelection
        selectedConsumers={null}
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
        selectedConsumers={null}
        consumers={['stackAlerts']}
        onChange={mockOnChange}
        errors={{}}
      />
    );

    expect(mockOnChange).toHaveBeenLastCalledWith(['stackAlerts']);
    expect(screen.queryByTestId('ruleFormConsumerSelect')).not.toBeInTheDocument();
  });

  it('should display nothing if observability is one of the consumers', () => {
    render(
      <RuleFormConsumerSelection
        selectedConsumers={null}
        consumers={['logs', 'observability']}
        onChange={mockOnChange}
        errors={{}}
      />
    );

    expect(screen.queryByTestId('ruleFormConsumerSelect')).not.toBeInTheDocument();
  });

  it('should display the initial selected consumer', async () => {
    render(
      <RuleFormConsumerSelection
        selectedConsumers={['logs']}
        consumers={mockConsumers}
        onChange={mockOnChange}
        errors={{}}
      />
    );
    expect(await screen.findByText('Logs')).toBeInTheDocument();
  });

  it('should not display the initial selected consumer if it is not a selectable option', async () => {
    render(
      <RuleFormConsumerSelection
        selectedConsumers={['logs']}
        consumers={['stackAlerts', 'infrastructure']}
        onChange={mockOnChange}
        errors={{}}
      />
    );
    expect(await screen.findByTestId('comboBoxSearchInput')).toHaveValue('');
  });
});
