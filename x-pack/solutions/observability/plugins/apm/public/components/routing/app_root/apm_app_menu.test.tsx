/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import type { AppMenuConfig, AppMenuItemType } from '@kbn/core-chrome-app-menu-components';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import type { ApmPluginContextValue } from '../../../context/apm_plugin/apm_plugin_context';
import { MockApmPluginContextWrapper } from '../../../context/apm_plugin/mock_apm_plugin_context';
import { useApmAppMenuConfig } from './apm_app_menu/apm_app_menu_context';
import { ApmAppMenu } from './apm_app_menu';

let latestMenuConfig: AppMenuConfig | undefined;

function CaptureMenuConfig() {
  latestMenuConfig = useApmAppMenuConfig();
  return null;
}

jest.mock('../../alerting/ui_components/alerting_flyout', () => ({
  AlertingFlyout: () => null,
}));

const mockGetAlertingCapabilities = jest.fn();
jest.mock('../../alerting/utils/get_alerting_capabilities', () => ({
  getAlertingCapabilities: () => mockGetAlertingCapabilities(),
}));

jest.mock('../../../context/anomaly_detection_jobs/use_anomaly_detection_jobs_context', () => ({
  useAnomalyDetectionJobsContext: () => ({
    anomalyDetectionSetupState: 'upToDate',
    anomalyDetectionJobsData: undefined,
    anomalyDetectionJobsStatus: 'success',
    anomalyDetectionJobsRefetch: () => {},
  }),
}));

jest.mock('../../../context/environments_context/use_environments_context', () => ({
  useEnvironmentsContext: () => ({
    environment: 'ENVIRONMENT_ALL',
    preferredEnvironment: 'ENVIRONMENT_ALL',
    environments: [],
    status: 'success',
  }),
}));

jest.mock('../../../hooks/use_apm_params', () => ({
  useApmParams: () => ({
    query: { environment: 'ENVIRONMENT_ALL' },
  }),
}));

jest.mock('../../../hooks/use_manage_slos_url', () => ({
  useManageSlosUrl: () => '/app/slos?filters=apm',
}));

jest.mock('../../../hooks/use_service_name', () => ({
  useServiceName: () => undefined,
}));

jest.mock('@kbn/observability-shared-plugin/public', () => ({
  ...jest.requireActual('@kbn/observability-shared-plugin/public'),
  useInspectorContext: () => ({ inspectorAdapters: {} }),
}));

const mockUiSettingsGet = jest.fn().mockReturnValue(false);

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  ...jest.requireActual('@kbn/kibana-react-plugin/public'),
  useKibana: () => ({
    services: {
      uiSettings: { get: mockUiSettingsGet },
      slo: undefined,
    },
  }),
}));

interface MockContextOptions {
  canSaveApm?: boolean;
  canCreateMlJobs?: boolean;
  canReadMlJobs?: boolean;
  canReadSlos?: boolean;
  canWriteSlos?: boolean;
  storageExplorerAvailable?: boolean;
}

interface MockAlertingOptions {
  isAlertingAvailable?: boolean;
  canReadAlerts?: boolean;
  canSaveAlerts?: boolean;
}

function createMockContext({
  canSaveApm = true,
  canCreateMlJobs = false,
  canReadMlJobs = true,
  canReadSlos = true,
  canWriteSlos = true,
  storageExplorerAvailable = false,
}: MockContextOptions = {}): Partial<ApmPluginContextValue> {
  return {
    core: {
      application: {
        navigateToUrl: jest.fn(),
        capabilities: {
          apm: { save: canSaveApm },
          ml: { canGetJobs: canReadMlJobs, canCreateJob: canCreateMlJobs },
          slo: { read: canReadSlos, write: canWriteSlos },
        },
      },
      http: {
        basePath: {
          prepend: (path: string) => path,
        },
      },
    },
    plugins: {
      observability: {
        useRulesLink: () => ({ href: '/rules' }),
      },
    },
    share: {
      url: {
        locators: {
          get: () => ({
            useUrl: () => '/add-data',
          }),
        },
      },
    },
    config: {
      featureFlags: {
        storageExplorerAvailable,
      },
    },
    inspector: {
      open: jest.fn(),
    },
  } as unknown as Partial<ApmPluginContextValue>;
}

function setupAlertingMock({
  isAlertingAvailable = true,
  canReadAlerts = true,
  canSaveAlerts = true,
}: MockAlertingOptions = {}) {
  mockGetAlertingCapabilities.mockReturnValue({
    isAlertingAvailable,
    canReadAlerts,
    canSaveAlerts,
  });
}

function findItem(id: string): AppMenuItemType | undefined {
  return latestMenuConfig?.items?.find((item) => item.id === id);
}

function renderAppMenu(mockContext?: Partial<ApmPluginContextValue>) {
  return render(
    <IntlProvider locale="en">
      <MockApmPluginContextWrapper value={mockContext as ApmPluginContextValue}>
        <ApmAppMenu>
          <CaptureMenuConfig />
        </ApmAppMenu>
      </MockApmPluginContextWrapper>
    </IntlProvider>
  );
}

describe('ApmAppMenu', () => {
  beforeEach(() => {
    latestMenuConfig = undefined;
    mockUiSettingsGet.mockReturnValue(false);
    setupAlertingMock();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('core items', () => {
    it('registers settings and add data', () => {
      renderAppMenu(createMockContext());

      expect(findItem('settings')).toMatchObject({
        label: 'Settings',
        testId: 'apmSettingsHeaderLink',
        href: '/app/apm/settings',
        ebt: { action: 'viewSettings' },
      });
      expect(latestMenuConfig?.primaryActionItem).toMatchObject({
        id: 'addData',
        label: 'Add data',
        testId: 'apmAddDataHeaderLink',
        href: '/add-data',
        ebt: { action: 'addData' },
      });
    });

    it('registers inspect when the UI setting is enabled', () => {
      mockUiSettingsGet.mockReturnValue(true);
      renderAppMenu(createMockContext());

      expect(findItem('inspect')).toMatchObject({
        label: 'Inspect',
        testId: 'apmInspectHeaderLink',
      });
    });

    it('omits inspect when the UI setting is disabled', () => {
      mockUiSettingsGet.mockReturnValue(false);
      renderAppMenu(createMockContext());

      expect(findItem('inspect')).toBeUndefined();
    });
  });

  describe('storage explorer', () => {
    it('registers storage explorer when the feature flag is enabled', () => {
      renderAppMenu(createMockContext({ storageExplorerAvailable: true }));

      expect(findItem('storageExplorer')).toMatchObject({
        label: 'Storage explorer',
        testId: 'apmStorageExplorerHeaderLink',
        href: '/app/apm/storage-explorer',
      });
    });

    it('omits storage explorer when the feature flag is disabled', () => {
      renderAppMenu(createMockContext({ storageExplorerAvailable: false }));

      expect(findItem('storageExplorer')).toBeUndefined();
    });
  });

  describe('anomaly detection', () => {
    it('registers anomaly detection when the user can create ML jobs', () => {
      renderAppMenu(createMockContext({ canCreateMlJobs: true }));

      expect(findItem('anomalyDetection')).toMatchObject({
        label: 'Anomaly detection',
        testId: 'apmAnomalyDetectionHeaderLink',
        href: '/app/apm/settings/anomaly-detection',
      });
    });

    it('omits anomaly detection when the user cannot create ML jobs', () => {
      renderAppMenu(createMockContext({ canCreateMlJobs: false }));

      expect(findItem('anomalyDetection')).toBeUndefined();
    });
  });

  describe('alerting', () => {
    it('registers alerts when alerting is available', () => {
      setupAlertingMock({ isAlertingAvailable: true });
      renderAppMenu(createMockContext());

      const alerts = findItem('alerts');
      expect(alerts).toMatchObject({
        label: 'Alerts',
        testId: 'apmAlertAndRulesHeaderLink',
      });
      expect(alerts && 'items' in alerts ? alerts.items : undefined).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: 'createThreshold',
            testId: 'apmAlertsMenuItemCreateThreshold',
          }),
          expect.objectContaining({
            id: 'createAnomalyRule',
            testId: 'apmAlertsMenuItemCreateAnomaly',
          }),
          expect.objectContaining({
            id: 'createErrorCountRule',
            testId: 'apmAlertsMenuItemErrorCount',
          }),
          expect.objectContaining({
            id: 'manageRules',
            testId: 'apmAlertsMenuItemManageRules',
            href: '/rules',
          }),
        ])
      );
    });

    it('omits alerts when alerting is not available', () => {
      setupAlertingMock({ isAlertingAvailable: false });
      renderAppMenu(createMockContext());

      expect(findItem('alerts')).toBeUndefined();
    });

    it('omits create-rule items when the user cannot save APM alerts', () => {
      setupAlertingMock({ isAlertingAvailable: true, canReadAlerts: true, canSaveAlerts: true });
      renderAppMenu(createMockContext({ canSaveApm: false }));

      const alerts = findItem('alerts');
      const items = alerts && 'items' in alerts ? alerts.items : [];
      expect(items?.map((item) => item.id)).toEqual(['manageRules']);
    });
  });

  describe('SLOs', () => {
    it('registers SLOs when the user can read or write', () => {
      renderAppMenu(createMockContext({ canReadSlos: true, canWriteSlos: false }));

      const slos = findItem('slos');
      expect(slos).toMatchObject({
        label: 'SLOs',
        testId: 'apmSlosHeaderLink',
      });
      expect(slos && 'items' in slos ? slos.items : undefined).toEqual([
        expect.objectContaining({
          id: 'manageSlos',
          testId: 'apmSlosMenuItemManageSlos',
          href: '/app/slos?filters=apm',
        }),
      ]);
    });

    it('includes create SLO items when the user can write', () => {
      renderAppMenu(createMockContext({ canReadSlos: false, canWriteSlos: true }));

      const slos = findItem('slos');
      const items = slos && 'items' in slos ? slos.items : [];
      expect(items?.map((item) => item.id)).toEqual(['createLatencySlo', 'createAvailabilitySlo']);
    });

    it('omits SLOs when the user has no SLO permissions', () => {
      renderAppMenu(createMockContext({ canReadSlos: false, canWriteSlos: false }));

      expect(findItem('slos')).toBeUndefined();
    });
  });

  describe('overflow', () => {
    it('keeps Alerts and SLOs inline and forces the rest into More', () => {
      mockUiSettingsGet.mockReturnValue(true);
      renderAppMenu(
        createMockContext({
          canCreateMlJobs: true,
          storageExplorerAvailable: true,
          canReadSlos: true,
          canWriteSlos: true,
        })
      );

      expect(findItem('alerts')).toMatchObject({ id: 'alerts' });
      expect(findItem('slos')).toMatchObject({ id: 'slos' });
      expect(findItem('alerts')).not.toHaveProperty('overflow', true);
      expect(findItem('slos')).not.toHaveProperty('overflow', true);

      expect(findItem('anomalyDetection')).toMatchObject({ overflow: true });
      expect(findItem('storageExplorer')).toMatchObject({ overflow: true });
      expect(findItem('settings')).toMatchObject({ overflow: true });
      expect(findItem('inspect')).toMatchObject({ overflow: true });
    });
  });
});
