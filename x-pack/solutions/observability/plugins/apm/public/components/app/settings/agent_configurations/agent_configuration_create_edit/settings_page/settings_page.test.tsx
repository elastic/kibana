/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SettingsPage } from './settings_page';
import { FETCH_STATUS } from '../../../../../../hooks/use_fetcher';
import type { AgentConfigurationIntake } from '../../../../../../../common/agent_configuration/configuration_types';
import { isRumOrMobileAgentName } from '@kbn/elastic-agent-utils';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';

// Mock the dependencies
jest.mock('../../../../../../context/apm_plugin/use_apm_plugin_context', () => ({
  useApmPluginContext: () => ({
    core: {
      notifications: {
        toasts: {
          addSuccess: jest.fn(),
          addError: jest.fn(),
        },
      },
    },
  }),
}));

jest.mock('@kbn/observability-shared-plugin/public', () => ({
  BottomBarActions: ({ children, ...props }: any) => (
    <div data-test-subj="bottom-bar-actions" {...props}>
      {children}
    </div>
  ),
  useUiTracker: () => jest.fn(),
}));

jest.mock('./save_config', () => ({
  saveConfig: jest.fn(),
}));

// Mock setting definitions to provide test data
jest.mock('../../../../../../../common/agent_configuration/setting_definitions', () => ({
  settingDefinitions: [
    {
      key: 'transaction_sample_rate',
      type: 'float',
      category: 'Performance',
      label: 'Transaction sample rate',
    },
    {
      key: 'span_compression_enabled',
      type: 'boolean',
      category: 'Performance',
      label: 'Span compression enabled',
    },
  ],
  filterByAgent: () => (setting: any) => true,
  validateSetting: () => ({ isValid: true }),
}));

jest.mock('@kbn/elastic-agent-utils', () => ({
  ...jest.requireActual('@kbn/elastic-agent-utils'),
  isRumOrMobileAgentName: jest.fn(),
}));

const mockedIsRumOrMobileAgentName = isRumOrMobileAgentName as jest.MockedFunction<
  typeof isRumOrMobileAgentName
>;

describe('SettingsPage - Advanced Configuration', () => {
  const mockSetNewConfig = jest.fn();
  const mockResetSettings = jest.fn();
  const mockOnClickEdit = jest.fn();

  const defaultProps = {
    initialConfig: {
      status: FETCH_STATUS.SUCCESS,
      data: {
        service: { name: 'test-service', environment: 'production' },
        settings: {},
        agent_name: 'java',
        '@timestamp': Date.now(),
        etag: 'test-etag',
      },
    },
    unsavedChanges: {},
    newConfig: {
      service: { name: 'test-service', environment: 'production' },
      settings: {},
      agent_name: 'java',
    } as AgentConfigurationIntake,
    setNewConfig: mockSetNewConfig,
    resetSettings: mockResetSettings,
    isEditMode: false,
    onClickEdit: mockOnClickEdit,
  };

  const renderSettingsPage = (props = {}) => {
    return render(
      <MemoryRouter>
        <IntlProvider locale="en">
          <SettingsPage {...defaultProps} {...props} />
        </IntlProvider>
      </MemoryRouter>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockedIsRumOrMobileAgentName.mockReturnValue(false);
  });

  describe('when agent is EDOT agent', () => {
    it('should show advanced configuration section', () => {
      renderSettingsPage({
        newConfig: {
          ...defaultProps.newConfig,
          agent_name: 'opentelemetry/java/elastic', // Real EDOT agent name
        },
      });

      // Advanced Configuration section should be visible
      expect(screen.getByText('Advanced Configuration')).toBeInTheDocument();
      expect(
        screen.getByText(/Advanced configuration allows you to define custom settings/)
      ).toBeInTheDocument();
      expect(screen.getByTestId('apmSettingsAddAdvancedConfigurationButton')).toBeInTheDocument();
      expect(screen.getByTestId('apmAdvancedConfigurationDocumentationLink')).toBeInTheDocument();
    });

    it('should render advanced configuration fields when custom settings exist', () => {
      renderSettingsPage({
        newConfig: {
          ...defaultProps.newConfig,
          agent_name: 'opentelemetry/dotnet/elastic', // Real EDOT agent name
          settings: {
            // These are custom settings (not in the mocked predefined list)
            'custom.otel.setting': 'custom-value',
            'my.custom.config': 'another-value',
            // This is a predefined setting (should not show in advanced config)
            transaction_sample_rate: '0.5',
          },
        },
      });

      // Only custom settings should show as advanced config fields (2 custom settings)
      const keyFields = screen.getAllByTestId('apmSettingsAdvancedConfigurationKeyField');
      const valueFields = screen.getAllByTestId('apmSettingsAdvancedConfigurationValueField');
      const removeButtons = screen.getAllByTestId('apmSettingsRemoveAdvancedConfigurationButton');

      expect(keyFields).toHaveLength(2);
      expect(valueFields).toHaveLength(2);
      expect(removeButtons).toHaveLength(2);
    });

    it('should show add configuration button', () => {
      renderSettingsPage({
        newConfig: {
          ...defaultProps.newConfig,
          agent_name: 'opentelemetry/nodejs/elastic', // Real EDOT agent name
        },
      });

      // Add configuration button should be clickable
      const addButton = screen.getByTestId('apmSettingsAddAdvancedConfigurationButton');
      expect(addButton).toBeInTheDocument();
      expect(addButton).toHaveTextContent('Add custom setting');
    });
  });

  describe('when agent is not EDOT agent', () => {
    it('should not show advanced configuration section', () => {
      renderSettingsPage({
        newConfig: {
          ...defaultProps.newConfig,
          agent_name: 'nodejs', // Real non-EDOT agent name
        },
      });

      // Advanced Configuration section should not be visible
      expect(screen.queryByText('Advanced Configuration')).not.toBeInTheDocument();
      expect(
        screen.queryByText('Advanced configuration allows you to define custom settings')
      ).not.toBeInTheDocument();
      expect(
        screen.queryByTestId('apmSettingsAddAdvancedConfigurationButton')
      ).not.toBeInTheDocument();
      expect(
        screen.queryByTestId('apmAdvancedConfigurationDocumentationLink')
      ).not.toBeInTheDocument();
    });

    it('should not show advanced configuration fields even with custom settings', () => {
      renderSettingsPage({
        newConfig: {
          ...defaultProps.newConfig,
          agent_name: 'java', // Real non-EDOT agent name
          settings: {
            // These custom settings should not appear as advanced config for non-EDOT agents
            'custom.otel.setting': 'custom-value',
            'my.custom.config': 'another-value',
          },
        },
      });

      // Advanced configuration fields should not be present (entire section is hidden for non-EDOT agents)
      expect(
        screen.queryByTestId('apmSettingsAdvancedConfigurationKeyField')
      ).not.toBeInTheDocument();
      expect(
        screen.queryByTestId('apmSettingsAdvancedConfigurationValueField')
      ).not.toBeInTheDocument();
      expect(
        screen.queryByTestId('apmSettingsRemoveAdvancedConfigurationButton')
      ).not.toBeInTheDocument();
    });
  });

  describe('when agent_name is not set', () => {
    it('should not show advanced configuration section', () => {
      renderSettingsPage({
        newConfig: {
          ...defaultProps.newConfig,
          agent_name: undefined, // No agent name
        },
      });

      // Advanced Configuration section should not be visible
      expect(screen.queryByText('Advanced Configuration')).not.toBeInTheDocument();
      expect(
        screen.queryByTestId('apmSettingsAddAdvancedConfigurationButton')
      ).not.toBeInTheDocument();
    });
  });

  describe('basic functionality', () => {
    it('should render service information correctly', () => {
      renderSettingsPage();

      // Service name and environment should be displayed
      expect(screen.getByTestId('settingsPage_serviceName')).toBeInTheDocument();
      expect(screen.getByTestId('settingsPage_environmentName')).toBeInTheDocument();
    });

    it('should show edit button when not in edit mode', () => {
      renderSettingsPage({ isEditMode: false });

      expect(screen.getByTestId('apmSettingsPageEditButton')).toBeInTheDocument();
    });

    it('should not show edit button when in edit mode', () => {
      renderSettingsPage({ isEditMode: true });

      expect(screen.queryByTestId('apmSettingsPageEditButton')).not.toBeInTheDocument();
    });
  });
});
