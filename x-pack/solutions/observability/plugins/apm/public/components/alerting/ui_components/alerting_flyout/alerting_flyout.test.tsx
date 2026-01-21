/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { AlertingFlyout } from '.';
import { ApmRuleType } from '@kbn/rule-data-utils';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';

const mockRuleFormFlyout = jest.fn();

const start = '2024-01-01T00:00:00.000Z';
const end = '2024-01-01T01:00:00.000Z';

jest.mock('@kbn/response-ops-rule-form/flyout', () => ({
  RuleFormFlyout: (props: any) => {
    mockRuleFormFlyout(props);
    return <div data-test-subj="mockRuleFormFlyout">Rule Form Flyout</div>;
  },
}));

jest.mock('@kbn/response-ops-rule-form/lib', () => ({
  isValidRuleFormPlugins: () => true,
}));

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useKibana: () => ({
    services: {
      triggersActionsUi: {
        ruleTypeRegistry: { get: jest.fn() },
        actionTypeRegistry: { get: jest.fn() },
      },
      application: { capabilities: {} },
      notifications: { toasts: {} },
      http: { basePath: { prepend: jest.fn() } },
      docLinks: { links: {} },
      uiSettings: { get: jest.fn() },
      settings: { client: { get: jest.fn() } },
    },
  }),
}));

jest.mock('../../../../hooks/use_service_name', () => ({
  useServiceName: () => 'test-service',
}));

jest.mock('../../../../hooks/use_apm_params', () => ({
  useApmParams: () => ({
    query: {
      rangeFrom: 'now-15m',
      rangeTo: 'now',
      environment: 'production',
      transactionType: 'request',
    },
    path: {},
  }),
}));

jest.mock('../../../../hooks/use_time_range', () => ({
  useTimeRange: () => ({
    start,
    end,
  }),
}));

function renderAlertingFlyout(props: Partial<React.ComponentProps<typeof AlertingFlyout>> = {}) {
  const defaultProps = {
    addFlyoutVisible: true,
    setAddFlyoutVisibility: jest.fn(),
    ruleType: ApmRuleType.TransactionDuration,
  };

  return render(
    <IntlProvider locale="en">
      <AlertingFlyout {...defaultProps} {...props} />
    </IntlProvider>
  );
}

describe('AlertingFlyout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders RuleFormFlyout when visible and ruleType is set', () => {
      renderAlertingFlyout({
        addFlyoutVisible: true,
        ruleType: ApmRuleType.TransactionDuration,
      });

      expect(screen.getByTestId('mockRuleFormFlyout')).toBeInTheDocument();
    });

    it('does not render when addFlyoutVisible is false', () => {
      renderAlertingFlyout({
        addFlyoutVisible: false,
        ruleType: ApmRuleType.TransactionDuration,
      });

      expect(screen.queryByTestId('mockRuleFormFlyout')).not.toBeInTheDocument();
    });

    it('does not render when ruleType is null', () => {
      renderAlertingFlyout({
        addFlyoutVisible: true,
        ruleType: null,
      });

      expect(screen.queryByTestId('mockRuleFormFlyout')).not.toBeInTheDocument();
    });
  });

  describe('rule types', () => {
    it('passes TransactionDuration ruleType correctly', () => {
      renderAlertingFlyout({
        addFlyoutVisible: true,
        ruleType: ApmRuleType.TransactionDuration,
      });

      expect(mockRuleFormFlyout).toHaveBeenCalledWith(
        expect.objectContaining({
          ruleTypeId: ApmRuleType.TransactionDuration,
        })
      );
    });

    it('passes TransactionErrorRate ruleType correctly', () => {
      renderAlertingFlyout({
        addFlyoutVisible: true,
        ruleType: ApmRuleType.TransactionErrorRate,
      });

      expect(mockRuleFormFlyout).toHaveBeenCalledWith(
        expect.objectContaining({
          ruleTypeId: ApmRuleType.TransactionErrorRate,
        })
      );
    });

    it('passes ErrorCount ruleType correctly', () => {
      renderAlertingFlyout({
        addFlyoutVisible: true,
        ruleType: ApmRuleType.ErrorCount,
      });

      expect(mockRuleFormFlyout).toHaveBeenCalledWith(
        expect.objectContaining({
          ruleTypeId: ApmRuleType.ErrorCount,
        })
      );
    });

    it('passes Anomaly ruleType correctly', () => {
      renderAlertingFlyout({
        addFlyoutVisible: true,
        ruleType: ApmRuleType.Anomaly,
      });

      expect(mockRuleFormFlyout).toHaveBeenCalledWith(
        expect.objectContaining({
          ruleTypeId: ApmRuleType.Anomaly,
        })
      );
    });
  });

  describe('service name handling', () => {
    it('uses serviceName prop when provided', () => {
      renderAlertingFlyout({
        addFlyoutVisible: true,
        ruleType: ApmRuleType.TransactionDuration,
        serviceName: 'custom-service',
      });

      expect(mockRuleFormFlyout).toHaveBeenCalledWith(
        expect.objectContaining({
          initialMetadata: expect.objectContaining({
            serviceName: 'custom-service',
          }),
        })
      );
    });

    it('uses service name from URL when prop is not provided', () => {
      renderAlertingFlyout({
        addFlyoutVisible: true,
        ruleType: ApmRuleType.TransactionDuration,
      });

      expect(mockRuleFormFlyout).toHaveBeenCalledWith(
        expect.objectContaining({
          initialMetadata: expect.objectContaining({
            serviceName: 'test-service',
          }),
        })
      );
    });
  });

  describe('metadata', () => {
    it('passes environment from query params', () => {
      renderAlertingFlyout({
        addFlyoutVisible: true,
        ruleType: ApmRuleType.TransactionDuration,
      });

      expect(mockRuleFormFlyout).toHaveBeenCalledWith(
        expect.objectContaining({
          initialMetadata: expect.objectContaining({
            environment: 'production',
          }),
        })
      );
    });

    it('passes transactionType for non-ErrorCount rules', () => {
      renderAlertingFlyout({
        addFlyoutVisible: true,
        ruleType: ApmRuleType.TransactionDuration,
      });

      expect(mockRuleFormFlyout).toHaveBeenCalledWith(
        expect.objectContaining({
          initialMetadata: expect.objectContaining({
            transactionType: 'request',
          }),
        })
      );
    });

    it('does not pass transactionType for ErrorCount rules', () => {
      renderAlertingFlyout({
        addFlyoutVisible: true,
        ruleType: ApmRuleType.ErrorCount,
      });

      expect(mockRuleFormFlyout).toHaveBeenCalledWith(
        expect.objectContaining({
          initialMetadata: expect.not.objectContaining({
            transactionType: expect.anything(),
          }),
        })
      );
    });

    it('passes time range from useTimeRange hook', () => {
      renderAlertingFlyout({
        addFlyoutVisible: true,
        ruleType: ApmRuleType.TransactionDuration,
      });

      expect(mockRuleFormFlyout).toHaveBeenCalledWith(
        expect.objectContaining({
          initialMetadata: expect.objectContaining({
            start,
            end,
          }),
        })
      );
    });
  });

  describe('callbacks', () => {
    it('calls setAddFlyoutVisibility with false on cancel', () => {
      const setAddFlyoutVisibility = jest.fn();
      renderAlertingFlyout({
        addFlyoutVisible: true,
        ruleType: ApmRuleType.TransactionDuration,
        setAddFlyoutVisibility,
      });

      const { onCancel } = mockRuleFormFlyout.mock.calls[0][0];
      onCancel();

      expect(setAddFlyoutVisibility).toHaveBeenCalledWith(false);
    });

    it('calls setAddFlyoutVisibility with false on submit', () => {
      const setAddFlyoutVisibility = jest.fn();
      renderAlertingFlyout({
        addFlyoutVisible: true,
        ruleType: ApmRuleType.TransactionDuration,
        setAddFlyoutVisibility,
      });

      const { onSubmit } = mockRuleFormFlyout.mock.calls[0][0];
      onSubmit();

      expect(setAddFlyoutVisibility).toHaveBeenCalledWith(false);
    });
  });

  describe('consumer', () => {
    it('passes APM_SERVER_FEATURE_ID as consumer', () => {
      renderAlertingFlyout({
        addFlyoutVisible: true,
        ruleType: ApmRuleType.TransactionDuration,
      });

      expect(mockRuleFormFlyout).toHaveBeenCalledWith(
        expect.objectContaining({
          consumer: 'apm',
        })
      );
    });
  });
});
