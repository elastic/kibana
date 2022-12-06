/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleExecutorServicesMock } from '@kbn/alerting-plugin/server/mocks';
import { alertsMock } from '@kbn/alerting-plugin/server/mocks';
import type { DetectionAlert } from '../../../../../../common/detection_engine/schemas/alerts';
import { ALERT_THRESHOLD_RESULT_COUNT } from '../../../../../../common/field_maps/field_names';
import { sampleThresholdAlert } from '../../../rule_types/__mocks__/threshold';
import type { NotificationRuleTypeParams } from './schedule_notification_actions';
import {
  formatAlertsForNotificationActions,
  normalizeAlertForNotificationActions,
  scheduleNotificationActions,
} from './schedule_notification_actions';

describe('schedule_notification_actions', () => {
  const alertServices: RuleExecutorServicesMock = alertsMock.createRuleExecutorServices();
  const alertId = 'fb30ddd1-5edc-43e2-9afb-3bcd970b78ee';

  const notificationRuleParams: NotificationRuleTypeParams = {
    author: ['123'],
    id: '123',
    name: 'some name',
    description: '123',
    buildingBlockType: undefined,
    from: '123',
    ruleId: '123',
    immutable: false,
    license: '',
    falsePositives: ['false positive 1', 'false positive 2'],
    query: 'user.name: root or user.name: admin',
    language: 'kuery',
    savedId: 'savedId-123',
    timelineId: 'timelineid-123',
    timelineTitle: 'timeline-title-123',
    meta: {},
    filters: [],
    index: ['index-123'],
    maxSignals: 100,
    responseActions: [],
    riskScore: 80,
    riskScoreMapping: [],
    ruleNameOverride: undefined,
    dataViewId: undefined,
    outputIndex: 'output-1',
    severity: 'high',
    severityMapping: [],
    threat: [],
    timestampOverride: undefined,
    timestampOverrideFallbackDisabled: undefined,
    to: 'now',
    type: 'query',
    references: ['http://www.example.com'],
    namespace: 'a namespace',
    note: '# sample markdown',
    version: 1,
    exceptionsList: [],
    relatedIntegrations: [],
    requiredFields: [],
    setup: '',
    alertSuppression: undefined,
  };

  it('Should schedule actions with unflatted and legacy context', () => {
    const alertInstance = alertServices.alertFactory.create(alertId);
    const signals = [sampleThresholdAlert._source, sampleThresholdAlert._source];
    scheduleNotificationActions({
      alertInstance,
      signalsCount: 2,
      resultsLink: '',
      ruleParams: notificationRuleParams,
      signals,
    });
    expect(alertInstance.scheduleActions).toHaveBeenCalledWith(
      'default',
      expect.objectContaining({
        alerts: [
          expect.objectContaining({
            host: expect.objectContaining({
              name: 'garden-gnomes',
            }),
            kibana: expect.objectContaining({
              alert: expect.objectContaining({
                rule: expect.objectContaining({
                  uuid: '7a7065d7-6e8b-4aae-8d20-c93613dec9f9',
                }),
              }),
            }),
            signal: expect.objectContaining({
              rule: expect.objectContaining({
                id: '7a7065d7-6e8b-4aae-8d20-c93613dec9f9',
              }),
            }),
          }),
          expect.objectContaining({
            kibana: expect.objectContaining({
              alert: expect.objectContaining({
                rule: expect.objectContaining({
                  uuid: '7a7065d7-6e8b-4aae-8d20-c93613dec9f9',
                }),
              }),
            }),
            signal: expect.objectContaining({
              rule: expect.objectContaining({
                id: '7a7065d7-6e8b-4aae-8d20-c93613dec9f9',
              }),
            }),
          }),
        ],
      })
    );
  });

  it('should properly generate normalized alert', () => {
    const signal = sampleThresholdAlert._source;
    expect(normalizeAlertForNotificationActions(signal as unknown as DetectionAlert)).toEqual(
      expect.objectContaining({
        [ALERT_THRESHOLD_RESULT_COUNT]: 3,
      })
    );
  });

  // Deprecation warning: we'll stop supporting signal.* fields eventually. At that point, this test
  // and supporting code should be removed.
  it('should properly generate legacy alert shim', () => {
    const signals = [sampleThresholdAlert._source];
    expect(formatAlertsForNotificationActions(signals)[0]).toEqual(
      expect.objectContaining({
        kibana: expect.objectContaining({
          alert: expect.objectContaining({
            threshold_result: expect.objectContaining({
              count: 3,
            }),
          }),
        }),
        signal: expect.objectContaining({
          rule: expect.objectContaining({
            id: '7a7065d7-6e8b-4aae-8d20-c93613dec9f9',
          }),
          threshold_result: expect.objectContaining({
            count: 3,
          }),
        }),
      })
    );
  });
});
