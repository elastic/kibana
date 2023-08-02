/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { RuleFormConsumerSelectionModal } from './rule_form_consumer_selection_modal';
import { RuleCreationValidConsumer } from '../../../types';

const mockConsumers: RuleCreationValidConsumer[] = [
  'logs',
  'infrastructure',
  'apm',
  'uptime',
  'slo',
  'stackAlerts',
];

const mockOnSave = jest.fn();
const mockOnCancel = jest.fn();
const mockOnChange = jest.fn();

describe('RuleFormConsumerSelectionModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly', async () => {
    render(
      <RuleFormConsumerSelectionModal
        consumers={mockConsumers}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
        onChange={mockOnChange}
      />
    );

    expect(screen.getByTestId('ruleFormConsumerSelectionModal')).toBeInTheDocument();
    expect(screen.getByTestId('ruleFormConsumerSelect')).toBeInTheDocument();
    expect(screen.getByTestId('confirmModalConfirmButton')).toBeInTheDocument();
    expect(screen.getByTestId('confirmModalCancelButton')).toBeInTheDocument();

    expect(screen.getByText('Logs')).toBeInTheDocument();
    expect(screen.getByText('Metrics')).toBeInTheDocument();
    expect(screen.getByText('APM and User Experience')).toBeInTheDocument();
    expect(screen.getByText('Synthetics and Uptime')).toBeInTheDocument();
    expect(screen.getByText('SLOs')).toBeInTheDocument();
    expect(screen.getByText('Stack Rules')).toBeInTheDocument();
  });

  it('should initialize dropdown if provided with a valid initial consumer', () => {
    render(
      <RuleFormConsumerSelectionModal
        consumers={mockConsumers}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
        onChange={mockOnChange}
      />
    );

    // Selects first option if no initial value is provided
    expect(mockOnChange).toHaveBeenLastCalledWith('apm');
    mockOnChange.mockClear();

    // Selects initial consumer
    render(
      <RuleFormConsumerSelectionModal
        consumers={mockConsumers}
        initialConsumer={'slo'}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
        onChange={mockOnChange}
      />
    );

    expect(mockOnChange).toHaveBeenLastCalledWith('slo');
    mockOnChange.mockClear();

    // Selects first value if provided with invalid consumer
    render(
      <RuleFormConsumerSelectionModal
        consumers={mockConsumers}
        initialConsumer={'hello' as RuleCreationValidConsumer}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
        onChange={mockOnChange}
      />
    );

    expect(mockOnChange).toHaveBeenLastCalledWith('apm');
  });

  it('should select options and save', () => {
    render(
      <RuleFormConsumerSelectionModal
        consumers={mockConsumers}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
        onChange={mockOnChange}
      />
    );

    mockConsumers.forEach((consumer) => {
      fireEvent.change(screen.getByTestId('ruleFormConsumerSelect'), {
        target: { value: consumer },
      });

      expect(mockOnChange).toHaveBeenLastCalledWith(consumer);

      fireEvent.click(screen.getByTestId('confirmModalConfirmButton'));
      expect(mockOnSave).toHaveBeenLastCalledWith(consumer);
    });
  });

  it('should call onCancel when the cancel button is clicked', () => {
    render(
      <RuleFormConsumerSelectionModal
        consumers={mockConsumers}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
        onChange={mockOnChange}
      />
    );

    fireEvent.click(screen.getByTestId('confirmModalCancelButton'));
    expect(mockOnCancel).toHaveBeenCalledTimes(1);
  });

  it('should default selection to the first option sorted alphabetically', () => {
    render(
      <RuleFormConsumerSelectionModal
        consumers={mockConsumers}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
        onChange={mockOnChange}
      />
    );

    fireEvent.click(screen.getByTestId('confirmModalConfirmButton'));
    fireEvent.click(screen.getByTestId('confirmModalCancelButton'));
    expect(mockOnSave).toHaveBeenLastCalledWith('apm');
  });
});
