/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { coreMock } from '@kbn/core/server/mocks';
import type { AnalyticsServiceSetup } from '@kbn/core/public';
import type { RuleParams } from '../../../rule_schema';
import type { SanitizedRuleConfig } from '@kbn/alerting-plugin/common';
import { ALERT_SUPPRESSION_EVENT } from '../../../../telemetry/event_based/events';

import {
  sendAlertSuppressionTelemetryEvent,
  suppressionDurationToSeconds,
} from './send_alert_suppression_telemetry_event';

describe('suppressionDurationToSeconds', () => {
  it('should convert hours to seconds', () => {
    expect(suppressionDurationToSeconds({ value: 5, unit: 'h' })).toBe(18000);
  });
  it('should convert minutes to seconds', () => {
    expect(suppressionDurationToSeconds({ value: 23, unit: 'm' })).toBe(1380);
  });
  it('should return seconds', () => {
    expect(suppressionDurationToSeconds({ value: 5, unit: 's' })).toBe(5);
  });
  it('should return -1 when duration is undefined', () => {
    expect(suppressionDurationToSeconds(undefined)).toBe(-1);
  });
});

describe('sendAlertSuppressionTelemetryEvent', () => {
  let mockTelemetry: jest.Mocked<AnalyticsServiceSetup>;
  let mockCore: ReturnType<typeof coreMock.createSetup>;
  const ruleAttributes = { name: 'Detects suspicious activity on endpoint' } as SanitizedRuleConfig;
  beforeEach(() => {
    mockCore = coreMock.createSetup();
    mockTelemetry = mockCore.analytics;
  });

  it('should not report event if suppression is not configured', () => {
    const ruleParams = {
      type: 'query',
      immutable: false,
    } as RuleParams;

    sendAlertSuppressionTelemetryEvent({
      telemetry: mockTelemetry,
      suppressedAlertsCount: 4,
      createdAlertsCount: 4,
      ruleParams,
      ruleAttributes,
    });

    expect(mockTelemetry.reportEvent).not.toHaveBeenCalled();
  });
  it('should not report event if no alerts created or suppressed', () => {
    const ruleParams = {
      type: 'query',
      immutable: false,
      alertSuppression: {
        groupBy: ['host.name'],
      },
    } as RuleParams;

    sendAlertSuppressionTelemetryEvent({
      telemetry: mockTelemetry,
      suppressedAlertsCount: 0,
      createdAlertsCount: 0,
      ruleParams,
      ruleAttributes,
    });

    expect(mockTelemetry.reportEvent).not.toHaveBeenCalled();
  });
  it('should report correct event data for threshold rule type', () => {
    const ruleParams = {
      type: 'threshold',
      immutable: false,
      alertSuppression: {
        duration: {
          unit: 'm',
          value: 20,
        },
      },
    } as RuleParams;

    sendAlertSuppressionTelemetryEvent({
      telemetry: mockTelemetry,
      suppressedAlertsCount: 1,
      createdAlertsCount: 6,
      ruleParams,
      ruleAttributes,
    });

    expect(mockTelemetry.reportEvent).toHaveBeenCalledWith(ALERT_SUPPRESSION_EVENT.eventType, {
      suppressionAlertsCreated: 6,
      suppressionAlertsSuppressed: 1,
      suppressionDuration: 1200,
      suppressionFieldsNumber: 0,
      suppressionMissingFields: false,
      suppressionRuleName: 'Custom rule',
      suppressionRuleType: 'threshold',
    });
  });
  it('should report correct event data for query rule type with per time period suppression', () => {
    const ruleParams = {
      type: 'query',
      immutable: false,
      alertSuppression: {
        groupBy: ['host.name'],
        duration: {
          unit: 'h',
          value: 1,
        },
      },
    } as RuleParams;

    sendAlertSuppressionTelemetryEvent({
      telemetry: mockTelemetry,
      suppressedAlertsCount: 0,
      createdAlertsCount: 10,
      ruleParams,
      ruleAttributes,
    });

    expect(mockTelemetry.reportEvent).toHaveBeenCalledWith(ALERT_SUPPRESSION_EVENT.eventType, {
      suppressionAlertsCreated: 10,
      suppressionAlertsSuppressed: 0,
      suppressionDuration: 3600,
      suppressionFieldsNumber: 1,
      suppressionMissingFields: true,
      suppressionRuleType: 'query',
      suppressionRuleName: 'Custom rule',
    });
  });

  it('should report correct event data for esql rule type with per execution suppression', () => {
    const ruleParams = {
      type: 'esql',
      immutable: false,
      alertSuppression: {
        groupBy: ['host.name', 'host.ip'],
        missingFieldsStrategy: 'doNotSuppress',
      },
    } as RuleParams;

    sendAlertSuppressionTelemetryEvent({
      telemetry: mockTelemetry,
      suppressedAlertsCount: 2,
      createdAlertsCount: 11,
      ruleParams,
      ruleAttributes,
    });

    expect(mockTelemetry.reportEvent).toHaveBeenCalledWith(ALERT_SUPPRESSION_EVENT.eventType, {
      suppressionAlertsCreated: 11,
      suppressionAlertsSuppressed: 2,
      suppressionDuration: -1,
      suppressionFieldsNumber: 2,
      suppressionMissingFields: false,
      suppressionRuleName: 'Custom rule',
      suppressionRuleType: 'esql',
    });
  });
  it('should report prebuilt rule name', () => {
    const ruleParams = {
      type: 'esql',
      immutable: true,
      alertSuppression: {
        groupBy: ['host.name', 'host.ip'],
        missingFieldsStrategy: 'doNotSuppress',
      },
    } as RuleParams;

    sendAlertSuppressionTelemetryEvent({
      telemetry: mockTelemetry,
      suppressedAlertsCount: 2,
      createdAlertsCount: 11,
      ruleParams,
      ruleAttributes,
    });

    expect(mockTelemetry.reportEvent).toHaveBeenCalledWith(
      ALERT_SUPPRESSION_EVENT.eventType,
      expect.objectContaining({
        suppressionRuleName: 'Detects suspicious activity on endpoint',
      })
    );
  });
});
