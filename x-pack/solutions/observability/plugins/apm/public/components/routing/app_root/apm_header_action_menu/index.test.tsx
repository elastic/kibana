/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { ApmHeaderActionMenu } from '.';
import { MockApmPluginContextWrapper } from '../../../../context/apm_plugin/mock_apm_plugin_context';
import type { ApmPluginContextValue } from '../../../../context/apm_plugin/apm_plugin_context';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';

jest.mock('./alerting_popover_flyout', () => ({
  AlertingPopoverAndFlyout: ({ canReadAlerts, canSaveAlerts }: any) => (
    <div
      data-test-subj="mockAlertingPopover"
      data-can-read={canReadAlerts}
      data-can-save={canSaveAlerts}
    >
      Alerting Popover
    </div>
  ),
}));

jest.mock('./slo_popover_flyout', () => ({
  SloPopoverAndFlyout: ({ canReadSlos, canWriteSlos }: any) => (
    <div data-test-subj="mockSloPopover" data-can-read={canReadSlos} data-can-write={canWriteSlos}>
      SLO Popover
    </div>
  ),
}));

jest.mock('./inspector_header_link', () => ({
  InspectorHeaderLink: () => <div data-test-subj="mockInspectorLink">Inspector</div>,
}));

jest.mock('./give_feedback_header_link', () => ({
  GiveFeedbackHeaderLink: () => <div data-test-subj="mockFeedbackLink">Feedback</div>,
}));

const mockGetAlertingCapabilities = jest.fn();
jest.mock('../../../alerting/utils/get_alerting_capabilities', () => ({
  getAlertingCapabilities: () => mockGetAlertingCapabilities(),
}));

interface MockContextOptions {
  canSaveApm?: boolean;
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
  canReadMlJobs = true,
  canReadSlos = true,
  canWriteSlos = true,
  storageExplorerAvailable = false,
}: MockContextOptions = {}): Partial<ApmPluginContextValue> {
  return {
    core: {
      application: {
        capabilities: {
          apm: { save: canSaveApm },
          ml: { canGetJobs: canReadMlJobs },
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

function renderHeaderMenu(mockContext?: Partial<ApmPluginContextValue>) {
  return render(
    <IntlProvider locale="en">
      <MockApmPluginContextWrapper value={mockContext as ApmPluginContextValue}>
        <ApmHeaderActionMenu />
      </MockApmPluginContextWrapper>
    </IntlProvider>
  );
}

describe('ApmHeaderActionMenu', () => {
  beforeEach(() => {
    setupAlertingMock();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders settings link', () => {
      renderHeaderMenu(createMockContext());

      expect(screen.getByTestId('apmSettingsHeaderLink')).toBeInTheDocument();
      expect(screen.getByText('Settings')).toBeInTheDocument();
    });

    it('renders add data link', () => {
      renderHeaderMenu(createMockContext());

      expect(screen.getByTestId('apmAddDataHeaderLink')).toBeInTheDocument();
      expect(screen.getByText('Add data')).toBeInTheDocument();
    });

    it('renders inspector header link', () => {
      renderHeaderMenu(createMockContext());

      expect(screen.getByTestId('mockInspectorLink')).toBeInTheDocument();
    });

    it('renders feedback header link', () => {
      renderHeaderMenu(createMockContext());

      expect(screen.getByTestId('mockFeedbackLink')).toBeInTheDocument();
    });
  });

  describe('storage explorer', () => {
    it('renders storage explorer link when feature flag is enabled', () => {
      renderHeaderMenu(createMockContext({ storageExplorerAvailable: true }));

      expect(screen.getByTestId('apmStorageExplorerHeaderLink')).toBeInTheDocument();
      expect(screen.getByText('Storage explorer')).toBeInTheDocument();
    });

    it('does not render storage explorer link when feature flag is disabled', () => {
      renderHeaderMenu(createMockContext({ storageExplorerAvailable: false }));

      expect(screen.queryByTestId('apmStorageExplorerHeaderLink')).not.toBeInTheDocument();
    });
  });

  describe('alerting', () => {
    it('renders alerting popover when alerting is available', () => {
      setupAlertingMock({ isAlertingAvailable: true });
      renderHeaderMenu(createMockContext());

      expect(screen.getByTestId('mockAlertingPopover')).toBeInTheDocument();
    });

    it('does not render alerting popover when alerting is not available', () => {
      setupAlertingMock({ isAlertingAvailable: false });
      renderHeaderMenu(createMockContext());

      expect(screen.queryByTestId('mockAlertingPopover')).not.toBeInTheDocument();
    });

    it('passes correct permissions to alerting popover', () => {
      setupAlertingMock({ isAlertingAvailable: true, canReadAlerts: true, canSaveAlerts: true });
      renderHeaderMenu(createMockContext({ canSaveApm: true }));

      const alertingPopover = screen.getByTestId('mockAlertingPopover');
      expect(alertingPopover).toHaveAttribute('data-can-read', 'true');
      expect(alertingPopover).toHaveAttribute('data-can-save', 'true');
    });

    it('passes false for canSaveAlerts when user cannot save APM', () => {
      setupAlertingMock({ isAlertingAvailable: true, canReadAlerts: true, canSaveAlerts: true });
      renderHeaderMenu(createMockContext({ canSaveApm: false }));

      const alertingPopover = screen.getByTestId('mockAlertingPopover');
      expect(alertingPopover).toHaveAttribute('data-can-save', 'false');
    });
  });

  describe('SLOs', () => {
    it('renders SLO popover when user can read SLOs', () => {
      renderHeaderMenu(createMockContext({ canReadSlos: true, canWriteSlos: false }));

      expect(screen.getByTestId('mockSloPopover')).toBeInTheDocument();
    });

    it('renders SLO popover when user can write SLOs', () => {
      renderHeaderMenu(createMockContext({ canReadSlos: false, canWriteSlos: true }));

      expect(screen.getByTestId('mockSloPopover')).toBeInTheDocument();
    });

    it('does not render SLO popover when user has no SLO permissions', () => {
      renderHeaderMenu(createMockContext({ canReadSlos: false, canWriteSlos: false }));

      expect(screen.queryByTestId('mockSloPopover')).not.toBeInTheDocument();
    });

    it('passes correct permissions to SLO popover', () => {
      renderHeaderMenu(createMockContext({ canReadSlos: true, canWriteSlos: true }));

      const sloPopover = screen.getByTestId('mockSloPopover');
      expect(sloPopover).toHaveAttribute('data-can-read', 'true');
      expect(sloPopover).toHaveAttribute('data-can-write', 'true');
    });
  });

  describe('permissions combinations', () => {
    it('renders both alerting and SLO popovers when user has all permissions', () => {
      setupAlertingMock({ isAlertingAvailable: true, canReadAlerts: true, canSaveAlerts: true });
      renderHeaderMenu(
        createMockContext({ canSaveApm: true, canReadSlos: true, canWriteSlos: true })
      );

      expect(screen.getByTestId('mockAlertingPopover')).toBeInTheDocument();
      expect(screen.getByTestId('mockSloPopover')).toBeInTheDocument();
    });

    it('renders only alerting popover when SLO permissions are missing', () => {
      setupAlertingMock({ isAlertingAvailable: true, canReadAlerts: true, canSaveAlerts: true });
      renderHeaderMenu(
        createMockContext({ canSaveApm: true, canReadSlos: false, canWriteSlos: false })
      );

      expect(screen.getByTestId('mockAlertingPopover')).toBeInTheDocument();
      expect(screen.queryByTestId('mockSloPopover')).not.toBeInTheDocument();
    });

    it('renders only SLO popover when alerting is not available', () => {
      setupAlertingMock({ isAlertingAvailable: false });
      renderHeaderMenu(createMockContext({ canReadSlos: true, canWriteSlos: true }));

      expect(screen.queryByTestId('mockAlertingPopover')).not.toBeInTheDocument();
      expect(screen.getByTestId('mockSloPopover')).toBeInTheDocument();
    });

    it('renders neither popover when user has no permissions', () => {
      setupAlertingMock({ isAlertingAvailable: false, canReadAlerts: false, canSaveAlerts: false });
      renderHeaderMenu(createMockContext({ canReadSlos: false, canWriteSlos: false }));

      expect(screen.queryByTestId('mockAlertingPopover')).not.toBeInTheDocument();
      expect(screen.queryByTestId('mockSloPopover')).not.toBeInTheDocument();
    });
  });
});
