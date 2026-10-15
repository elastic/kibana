/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { APP_HEADER_TEST_SUBJECTS, AppHeader as MockAppHeaderComponent } from '@kbn/app-header';
import { MockAppHeaderProvider } from '@kbn/app-header/mocks';
import type { ApmMainTemplateHeaderProps } from './apm_main_template';
import { SettingsTemplate } from './settings_template';

// Stable link stub: returns a recognisable string per path.
const mockLink = jest.fn((path: string) => `/link${path}`);

jest.mock('../../../hooks/use_apm_router', () => ({
  useApmRouter: () => ({ link: mockLink }),
}));

// Configurable mock so individual tests can toggle feature flags and ML capability.
const mockPluginContext = {
  core: {
    application: {
      capabilities: {
        ml: { canGetJobs: true },
      },
      uiSettings: { get: () => 'ENVIRONMENT_ALL' },
    },
  },
  config: {
    featureFlags: {
      agentConfigurationAvailable: true,
      configurableIndicesAvailable: true,
      migrationToFleetAvailable: true,
    },
  },
};

jest.mock('../../../context/apm_plugin/use_apm_plugin_context', () => ({
  useApmPluginContext: () => mockPluginContext,
}));

// Render ApmMainTemplate as a thin wrapper that passes `header` straight into a real AppHeader
// (so we exercise the full tab-building logic without wiring up the template's own dependencies).
// MockAppHeaderComponent is aliased to start with "Mock" so Jest's factory out-of-scope check permits it.
jest.mock('./apm_main_template', () => ({
  ApmMainTemplate: ({
    header,
    children,
  }: {
    header?: ApmMainTemplateHeaderProps;
    children?: React.ReactNode;
  }) => (
    <>
      {header ? <MockAppHeaderComponent {...header} /> : null}
      {children}
    </>
  ),
}));

function renderTemplate(selectedTab: React.ComponentProps<typeof SettingsTemplate>['selectedTab']) {
  return render(
    <MockAppHeaderProvider>
      <SettingsTemplate selectedTab={selectedTab}>
        <div data-test-subj="content">page content</div>
      </SettingsTemplate>
    </MockAppHeaderProvider>
  );
}

describe('SettingsTemplate', () => {
  beforeEach(() => {
    mockLink.mockImplementation((path: string) => `/link${path}`);
    mockPluginContext.core.application.capabilities.ml = { canGetJobs: true };
    mockPluginContext.config.featureFlags = {
      agentConfigurationAvailable: true,
      configurableIndicesAvailable: true,
      migrationToFleetAvailable: true,
    };
  });

  it('renders AppHeader with title "Settings"', () => {
    renderTemplate('general-settings');

    expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.title)).toHaveTextContent('Settings');
  });

  it('renders the tab row', () => {
    renderTemplate('general-settings');

    expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.tabs)).toBeInTheDocument();
  });

  it('marks the selected tab as selected', () => {
    renderTemplate('agent-keys');

    const selectedTab = screen.getByTestId('apmSettingsTab_agent-keys');
    expect(selectedTab).toHaveAttribute('aria-selected', 'true');
  });

  it('does not mark other tabs as selected', () => {
    renderTemplate('agent-keys');

    const generalTab = screen.getByTestId('apmSettingsTab_general-settings');
    expect(generalTab).not.toHaveAttribute('aria-selected', 'true');
  });

  it('does not render a back button (Settings is a top-level route)', () => {
    renderTemplate('general-settings');

    expect(screen.queryByTestId(APP_HEADER_TEST_SUBJECTS.back)).not.toBeInTheDocument();
  });

  it('renders children', () => {
    renderTemplate('general-settings');

    expect(screen.getByTestId('content')).toBeInTheDocument();
  });

  describe('always-visible tabs', () => {
    it('renders General settings, Agent Explorer, Agent Keys, and Custom Links regardless of feature flags', () => {
      mockPluginContext.config.featureFlags = {
        agentConfigurationAvailable: false,
        configurableIndicesAvailable: false,
        migrationToFleetAvailable: false,
      };
      renderTemplate('general-settings');

      expect(screen.getByTestId('apmSettingsTab_general-settings')).toBeInTheDocument();
      expect(screen.getByTestId('apmSettingsTab_agent-explorer')).toBeInTheDocument();
      expect(screen.getByTestId('apmSettingsTab_agent-keys')).toBeInTheDocument();
      expect(screen.getByTestId('apmSettingsTab_custom-links')).toBeInTheDocument();
    });
  });

  describe('feature-flagged tabs', () => {
    it('hides Agent Configuration when agentConfigurationAvailable is false', () => {
      mockPluginContext.config.featureFlags.agentConfigurationAvailable = false;
      renderTemplate('general-settings');

      expect(screen.queryByTestId('apmSettingsTab_agent-configuration')).not.toBeInTheDocument();
    });

    it('shows Agent Configuration when agentConfigurationAvailable is true', () => {
      mockPluginContext.config.featureFlags.agentConfigurationAvailable = true;
      renderTemplate('general-settings');

      expect(screen.getByTestId('apmSettingsTab_agent-configuration')).toBeInTheDocument();
    });

    it('hides Indices when configurableIndicesAvailable is false', () => {
      mockPluginContext.config.featureFlags.configurableIndicesAvailable = false;
      renderTemplate('general-settings');

      expect(screen.queryByTestId('apmSettingsTab_apm-indices')).not.toBeInTheDocument();
    });

    it('shows Indices when configurableIndicesAvailable is true', () => {
      mockPluginContext.config.featureFlags.configurableIndicesAvailable = true;
      renderTemplate('general-settings');

      expect(screen.getByTestId('apmSettingsTab_apm-indices')).toBeInTheDocument();
    });

    it('hides Schema when migrationToFleetAvailable is false', () => {
      mockPluginContext.config.featureFlags.migrationToFleetAvailable = false;
      renderTemplate('general-settings');

      expect(screen.queryByTestId('apmSettingsTab_schema')).not.toBeInTheDocument();
    });

    it('shows Schema when migrationToFleetAvailable is true', () => {
      mockPluginContext.config.featureFlags.migrationToFleetAvailable = true;
      renderTemplate('general-settings');

      expect(screen.getByTestId('apmSettingsTab_schema')).toBeInTheDocument();
    });
  });

  describe('ML-gated tab', () => {
    it('hides Anomaly detection when canGetJobs is false', () => {
      mockPluginContext.core.application.capabilities.ml = { canGetJobs: false };
      renderTemplate('general-settings');

      expect(screen.queryByTestId('apmSettingsTab_anomaly-detection')).not.toBeInTheDocument();
    });

    it('shows Anomaly detection when canGetJobs is true', () => {
      mockPluginContext.core.application.capabilities.ml = { canGetJobs: true };
      renderTemplate('general-settings');

      expect(screen.getByTestId('apmSettingsTab_anomaly-detection')).toBeInTheDocument();
    });
  });
});
