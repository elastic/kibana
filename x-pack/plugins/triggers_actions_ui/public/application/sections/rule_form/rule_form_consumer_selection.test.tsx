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

const mockConsumers: RuleCreationValidConsumer[] = [
  'logs',
  'infrastructure',
  'apm',
  'uptime',
  'slo',
  'stackAlerts',
];

const mockOnChange = jest.fn();

describe('RuleFormConsumerSelectionModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly', async () => {
    render(<RuleFormConsumerSelection consumers={mockConsumers} onChange={mockOnChange} />);

    expect(screen.getByTestId('ruleFormConsumerSelect')).toBeInTheDocument();

    expect(screen.getByText('Logs')).toBeInTheDocument();
    expect(screen.getByText('Metrics')).toBeInTheDocument();
    expect(screen.getByText('APM and User Experience')).toBeInTheDocument();
    expect(screen.getByText('Synthetics and Uptime')).toBeInTheDocument();
    expect(screen.getByText('SLOs')).toBeInTheDocument();
    expect(screen.getByText('Stack Rules')).toBeInTheDocument();
  });

  it('should initialize dropdown if provided with a valid initial consumer', () => {
    render(<RuleFormConsumerSelection consumers={mockConsumers} onChange={mockOnChange} />);

    // Selects first option if no initial value is provided
    expect(mockOnChange).toHaveBeenLastCalledWith('apm');
    mockOnChange.mockClear();

    // Selects initial consumer
    render(
      <RuleFormConsumerSelection
        consumers={mockConsumers}
        initialConsumer={'slo'}
        onChange={mockOnChange}
      />
    );

    expect(mockOnChange).toHaveBeenLastCalledWith('slo');
    mockOnChange.mockClear();

    // Selects first value if provided with invalid consumer
    render(
      <RuleFormConsumerSelection
        consumers={mockConsumers}
        initialConsumer={'invalidConsumer' as RuleCreationValidConsumer}
        onChange={mockOnChange}
      />
    );

    expect(mockOnChange).toHaveBeenLastCalledWith('apm');
  });

  it('should select options and call onChange', () => {
    render(<RuleFormConsumerSelection consumers={mockConsumers} onChange={mockOnChange} />);

    mockConsumers.forEach((consumer) => {
      fireEvent.change(screen.getByTestId('ruleFormConsumerSelect'), {
        target: { value: consumer },
      });

      expect(mockOnChange).toHaveBeenLastCalledWith(consumer);
    });
  });

  it('should default selection to the first option sorted alphabetically', () => {
    render(<RuleFormConsumerSelection consumers={mockConsumers} onChange={mockOnChange} />);

    expect(mockOnChange).toHaveBeenLastCalledWith('apm');
  });

  it('should default to specified consumer if passed in', () => {
    render(
      <RuleFormConsumerSelection
        initialConsumer={'stackAlerts'}
        consumers={mockConsumers}
        onChange={mockOnChange}
      />
    );

    expect(mockOnChange).toHaveBeenLastCalledWith('stackAlerts');
  });

  it('should display nothing if there is only 1 consumer to select', () => {
    render(<RuleFormConsumerSelection consumers={['stackAlerts']} onChange={mockOnChange} />);

    expect(mockOnChange).toHaveBeenLastCalledWith('stackAlerts');
    expect(screen.queryByTestId('ruleFormConsumerSelect')).not.toBeInTheDocument();
  });
});
