/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { AgentConfigurationIntake } from '../../../../../../../common/agent_configuration/configuration_types';
import type { SettingDefinition } from '../../../../../../../common/agent_configuration/setting_definitions/types';
import type { ITelemetryClient } from '../../../../../../services/telemetry';
import { reportTelemetry } from './settings_page';

describe('reportTelemetry', () => {
  const mockTelemetry = {
    reportAgentConfigurationChanged: jest.fn(),
  } as unknown as ITelemetryClient;

  const mockConfig = {
    agent_name: 'java',
    service: {
      environment: 'production',
    },
    settings: {
      transaction_sample_rate: '0.5',
      capture_body: 'all',
      custom_setting: 'custom_value',
    },
  } as AgentConfigurationIntake;

  const mockSettingsDefinitions = [
    { key: 'transaction_sample_rate', label: 'Transaction Sample Rate' },
    { key: 'capture_body', label: 'Capture Body' },
  ] as SettingDefinition[];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('reports telemetry with predefined and advanced settings', () => {
    reportTelemetry({
      telemetry: mockTelemetry,
      config: mockConfig,
      settingsDefinitions: mockSettingsDefinitions,
    });

    expect(mockTelemetry.reportAgentConfigurationChanged).toHaveBeenCalledWith({
      agentName: 'java',
      environment: 'production',
      predefinedSettings: [
        { key: 'transaction_sample_rate', value: '0.5' },
        { key: 'capture_body', value: 'all' },
      ],
      advancedSettings: [{ key: 'custom_setting', value: 'custom_value' }],
    });
  });

  it('handles empty settings gracefully', () => {
    const emptyConfig = {
      ...mockConfig,
      settings: {},
    };

    reportTelemetry({
      telemetry: mockTelemetry,
      config: emptyConfig,
      settingsDefinitions: mockSettingsDefinitions,
    });

    expect(mockTelemetry.reportAgentConfigurationChanged).toHaveBeenCalledWith({
      agentName: 'java',
      environment: 'production',
      predefinedSettings: [],
      advancedSettings: [],
    });
  });

  it('defaults agentName and environment to "all" if not provided', () => {
    const configWithoutAgentAndEnvironment = {
      ...mockConfig,
      agent_name: undefined,
      service: {
        environment: undefined,
      },
    };

    reportTelemetry({
      telemetry: mockTelemetry,
      config: configWithoutAgentAndEnvironment,
      settingsDefinitions: mockSettingsDefinitions,
    });

    expect(mockTelemetry.reportAgentConfigurationChanged).toHaveBeenCalledWith({
      agentName: 'all',
      environment: 'all',
      predefinedSettings: [
        { key: 'transaction_sample_rate', value: '0.5' },
        { key: 'capture_body', value: 'all' },
      ],
      advancedSettings: [{ key: 'custom_setting', value: 'custom_value' }],
    });
  });

  it('handles missing settingsDefinitions gracefully', () => {
    reportTelemetry({
      telemetry: mockTelemetry,
      config: mockConfig,
      settingsDefinitions: [],
    });

    expect(mockTelemetry.reportAgentConfigurationChanged).toHaveBeenCalledWith({
      agentName: 'java',
      environment: 'production',
      predefinedSettings: [],
      advancedSettings: [
        { key: 'transaction_sample_rate', value: '0.5' },
        { key: 'capture_body', value: 'all' },
        { key: 'custom_setting', value: 'custom_value' },
      ],
    });
  });
});
