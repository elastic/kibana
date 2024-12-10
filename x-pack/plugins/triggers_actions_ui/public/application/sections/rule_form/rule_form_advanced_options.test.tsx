/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { httpServiceMock } from '@kbn/core/public/mocks';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { RuleFormAdvancedOptions } from './rule_form_advanced_options';
import { useKibana } from '../../../common/lib/kibana';
import userEvent from '@testing-library/user-event';
import { ApplicationStart } from '@kbn/core-application-browser';

jest.mock('../../../common/lib/kibana');

const useKibanaMock = useKibana as jest.Mocked<typeof useKibana>;

const queryClient = new QueryClient();

const http = httpServiceMock.createStartContract();

const mockFlappingSettings = {
  lookBackWindow: 5,
  statusChangeThreshold: 5,
};

const mockOnflappingChange = jest.fn();
const mockAlertDelayChange = jest.fn();

describe('ruleFormAdvancedOptions', () => {
  beforeEach(() => {
    http.get.mockResolvedValue({
      look_back_window: 10,
      status_change_threshold: 3,
      enabled: true,
    });
    useKibanaMock().services.http = http;
    useKibanaMock().services.application.capabilities = {
      rulesSettings: {
        writeFlappingSettingsUI: true,
      },
    } as unknown as ApplicationStart['capabilities'];
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should render correctly', async () => {
    render(
      <IntlProvider locale="en">
        <QueryClientProvider client={queryClient}>
          <RuleFormAdvancedOptions
            enabledFlapping
            alertDelay={5}
            flappingSettings={mockFlappingSettings}
            onAlertDelayChange={mockAlertDelayChange}
            onFlappingChange={mockOnflappingChange}
          />
        </QueryClientProvider>
      </IntlProvider>
    );

    expect(await screen.findByTestId('ruleFormAdvancedOptions')).toBeInTheDocument();
    expect(await screen.findByTestId('alertDelayFormRow')).toBeInTheDocument();
    expect(await screen.findByTestId('alertFlappingFormRow')).toBeInTheDocument();
  });

  test('should initialize correctly when global flapping is on and override is not applied', async () => {
    render(
      <IntlProvider locale="en">
        <QueryClientProvider client={queryClient}>
          <RuleFormAdvancedOptions
            enabledFlapping
            alertDelay={5}
            onAlertDelayChange={mockAlertDelayChange}
            onFlappingChange={mockOnflappingChange}
          />
        </QueryClientProvider>
      </IntlProvider>
    );

    expect(await screen.findByText('ON')).toBeInTheDocument();
    expect(screen.getByTestId('ruleFormAdvancedOptionsOverrideSwitch')).not.toBeChecked();
    expect(screen.queryByText('Custom')).not.toBeInTheDocument();
    expect(screen.getByTestId('ruleSettingsFlappingMessage')).toHaveTextContent(
      'All rules (in this space) detect an alert is flapping when it changes status at least 3 times in the last 10 rule runs.'
    );

    await userEvent.click(screen.getByTestId('ruleFormAdvancedOptionsOverrideSwitch'));
    expect(mockOnflappingChange).toHaveBeenCalledWith({
      lookBackWindow: 10,
      statusChangeThreshold: 3,
    });
  });

  test('should initialize correctly when global flapping is on and override is appplied', async () => {
    render(
      <IntlProvider locale="en">
        <QueryClientProvider client={queryClient}>
          <RuleFormAdvancedOptions
            enabledFlapping
            alertDelay={5}
            flappingSettings={{
              lookBackWindow: 6,
              statusChangeThreshold: 4,
            }}
            onAlertDelayChange={mockAlertDelayChange}
            onFlappingChange={mockOnflappingChange}
          />
        </QueryClientProvider>
      </IntlProvider>
    );

    expect(await screen.findByTestId('ruleFormAdvancedOptionsOverrideSwitch')).toBeChecked();
    expect(screen.getByText('Custom')).toBeInTheDocument();
    expect(screen.getByTestId('lookBackWindowRangeInput')).toHaveValue('6');
    expect(screen.getByTestId('statusChangeThresholdRangeInput')).toHaveValue('4');
    expect(screen.getByTestId('ruleSettingsFlappingMessage')).toHaveTextContent(
      'This rule detects an alert is flapping if it changes status at least 4 times in the last 6 rule runs.'
    );

    await userEvent.click(screen.getByTestId('ruleFormAdvancedOptionsOverrideSwitch'));
    expect(mockOnflappingChange).toHaveBeenCalledWith(null);
  });

  test('should not allow override when global flapping is off', async () => {
    http.get.mockResolvedValue({
      look_back_window: 10,
      status_change_threshold: 3,
      enabled: false,
    });
    useKibanaMock().services.http = http;

    render(
      <IntlProvider locale="en">
        <QueryClientProvider client={queryClient}>
          <RuleFormAdvancedOptions
            enabledFlapping
            alertDelay={5}
            flappingSettings={{
              lookBackWindow: 6,
              statusChangeThreshold: 4,
            }}
            onAlertDelayChange={mockAlertDelayChange}
            onFlappingChange={mockOnflappingChange}
          />
        </QueryClientProvider>
      </IntlProvider>
    );

    expect(await screen.findByText('OFF')).toBeInTheDocument();
    expect(screen.queryByText('Custom')).not.toBeInTheDocument();
    expect(screen.queryByTestId('ruleFormAdvancedOptionsOverrideSwitch')).not.toBeInTheDocument();
    expect(screen.queryByTestId('ruleSettingsFlappingMessage')).not.toBeInTheDocument();

    await userEvent.click(screen.getByTestId('ruleSettingsFlappingFormTooltipButton'));

    expect(screen.getByTestId('ruleSettingsFlappingFormTooltipContent')).toBeInTheDocument();
  });

  test('should allow for flapping inputs to be modified', async () => {
    render(
      <IntlProvider locale="en">
        <QueryClientProvider client={queryClient}>
          <RuleFormAdvancedOptions
            enabledFlapping
            alertDelay={5}
            flappingSettings={{
              lookBackWindow: 10,
              statusChangeThreshold: 10,
            }}
            onAlertDelayChange={mockAlertDelayChange}
            onFlappingChange={mockOnflappingChange}
          />
        </QueryClientProvider>
      </IntlProvider>
    );

    expect(await screen.findByTestId('lookBackWindowRangeInput')).toBeInTheDocument();

    const lookBackWindowInput = screen.getByTestId('lookBackWindowRangeInput');
    const statusChangeThresholdInput = screen.getByTestId('statusChangeThresholdRangeInput');

    // Change lookBackWindow to a smaller value
    fireEvent.change(lookBackWindowInput, { target: { value: 5 } });
    // statusChangeThresholdInput gets pinned to be 5
    expect(mockOnflappingChange).toHaveBeenLastCalledWith({
      lookBackWindow: 5,
      statusChangeThreshold: 5,
    });

    // Try making statusChangeThreshold bigger
    fireEvent.change(statusChangeThresholdInput, { target: { value: 20 } });
    // Still pinned
    expect(mockOnflappingChange).toHaveBeenLastCalledWith({
      lookBackWindow: 10,
      statusChangeThreshold: 10,
    });

    fireEvent.change(statusChangeThresholdInput, { target: { value: 3 } });
    expect(mockOnflappingChange).toHaveBeenLastCalledWith({
      lookBackWindow: 10,
      statusChangeThreshold: 3,
    });
  });

  test('should not render flapping if enableFlapping is false', () => {
    render(
      <IntlProvider locale="en">
        <QueryClientProvider client={queryClient}>
          <RuleFormAdvancedOptions
            enabledFlapping={false}
            alertDelay={5}
            flappingSettings={{
              lookBackWindow: 10,
              statusChangeThreshold: 10,
            }}
            onAlertDelayChange={mockAlertDelayChange}
            onFlappingChange={mockOnflappingChange}
          />
        </QueryClientProvider>
      </IntlProvider>
    );

    expect(screen.queryByTestId('alertFlappingFormRow')).not.toBeInTheDocument();
  });
});
