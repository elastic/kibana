/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { GeneralSettings } from '.';

const mockUseEditableSettings = jest.fn();

jest.mock('@kbn/observability-shared-plugin/public', () => ({
  BottomBarActions: () => null,
  useEditableSettings: (...args: unknown[]) => mockUseEditableSettings(...args),
  useUiTracker: () => jest.fn(),
}));

jest.mock('../../../../context/apm_plugin/use_apm_plugin_context', () => ({
  useApmPluginContext: () => ({
    core: {
      docLinks: { links: { management: {} } },
      notifications: { toasts: { addDanger: jest.fn() } },
      settings: { client: { validateValue: jest.fn() } },
      application: {
        capabilities: { advancedSettings: { save: true }, apm: { 'settings:save': true } },
      },
    },
  }),
}));

jest.mock('../../../../hooks/use_profiling_integration_setting', () => ({
  useProfilingPluginSetting: () => false,
}));

const editableSettings = {
  fields: {},
  isLoading: false,
  loadError: undefined,
  unsavedChanges: {},
  handleFieldChange: jest.fn(),
  saveAll: jest.fn(),
  isSaving: false,
  cleanUnsavedChanges: jest.fn(),
};

describe('GeneralSettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows a spinner while the setting definitions load', () => {
    mockUseEditableSettings.mockReturnValue({ ...editableSettings, isLoading: true });

    render(<GeneralSettings />);

    expect(screen.getByTestId('apmGeneralSettingsLoading')).toBeInTheDocument();
    expect(screen.queryByTestId('apmGeneralSettingsLoadError')).not.toBeInTheDocument();
  });

  it('shows an error callout that replaces the spinner when the setting definitions fail to load', () => {
    mockUseEditableSettings.mockReturnValue({
      ...editableSettings,
      loadError: new Error('Internal Server Error'),
    });

    render(<GeneralSettings />);

    const loadError = screen.getByTestId('apmGeneralSettingsLoadError');
    expect(loadError).toHaveTextContent('Unable to load settings');
    expect(loadError).toHaveTextContent('Internal Server Error');
    expect(screen.queryByTestId('apmGeneralSettingsLoading')).not.toBeInTheDocument();
  });

  it('shows neither the spinner nor the error callout once the settings have loaded', () => {
    mockUseEditableSettings.mockReturnValue(editableSettings);

    render(<GeneralSettings />);

    expect(screen.queryByTestId('apmGeneralSettingsLoading')).not.toBeInTheDocument();
    expect(screen.queryByTestId('apmGeneralSettingsLoadError')).not.toBeInTheDocument();
  });
});
