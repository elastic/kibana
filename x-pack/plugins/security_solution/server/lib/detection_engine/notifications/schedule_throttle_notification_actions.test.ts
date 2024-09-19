/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from 'src/core/server/mocks';
import { alertsMock } from '../../../../../alerting/server/mocks';
import { scheduleThrottledNotificationActions } from './schedule_throttle_notification_actions';
import {
  NotificationRuleTypeParams,
  scheduleNotificationActions,
} from './schedule_notification_actions';

jest.mock('./schedule_notification_actions', () => ({
  scheduleNotificationActions: jest.fn(),
}));

describe('schedule_throttle_notification_actions', () => {
  let notificationRuleParams: NotificationRuleTypeParams;

  beforeEach(() => {
    (scheduleNotificationActions as jest.Mock).mockReset();
    notificationRuleParams = {
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
      riskScore: 80,
      riskScoreMapping: [],
      ruleNameOverride: undefined,
      outputIndex: 'output-1',
      severity: 'high',
      severityMapping: [],
      threat: [],
      timestampOverride: undefined,
      to: 'now',
      type: 'query',
      references: ['http://www.example.com'],
      namespace: 'a namespace',
      note: '# sample markdown',
      version: 1,
      exceptionsList: [],
    };
  });

  it('should call "scheduleNotificationActions" if the results length is 1 or greater', async () => {
    await scheduleThrottledNotificationActions({
      throttle: '1d',
      startedAt: new Date('2021-08-24T19:19:22.094Z'),
      id: '123',
      kibanaSiemAppUrl: 'http://www.example.com',
      outputIndex: 'output-123',
      ruleId: 'rule-123',
      esClient: elasticsearchServiceMock.createElasticsearchClient(
        elasticsearchServiceMock.createSuccessTransportRequestPromise({
          hits: {
            hits: [
              {
                _source: {},
              },
            ],
            total: 1,
          },
        })
      ),
      alertInstance: alertsMock.createAlertInstanceFactory(),
      notificationRuleParams,
    });

    expect(scheduleNotificationActions as jest.Mock).toHaveBeenCalled();
  });

  it('should NOT call "scheduleNotificationActions" if the results length is 0', async () => {
    await scheduleThrottledNotificationActions({
      throttle: '1d',
      startedAt: new Date('2021-08-24T19:19:22.094Z'),
      id: '123',
      kibanaSiemAppUrl: 'http://www.example.com',
      outputIndex: 'output-123',
      ruleId: 'rule-123',
      esClient: elasticsearchServiceMock.createElasticsearchClient(
        elasticsearchServiceMock.createSuccessTransportRequestPromise({
          hits: {
            hits: [],
            total: 0,
          },
        })
      ),
      alertInstance: alertsMock.createAlertInstanceFactory(),
      notificationRuleParams,
    });

    expect(scheduleNotificationActions as jest.Mock).not.toHaveBeenCalled();
  });

  it('should NOT call "scheduleNotificationActions" if "throttle" is an invalid string', async () => {
    await scheduleThrottledNotificationActions({
      throttle: 'invalid',
      startedAt: new Date('2021-08-24T19:19:22.094Z'),
      id: '123',
      kibanaSiemAppUrl: 'http://www.example.com',
      outputIndex: 'output-123',
      ruleId: 'rule-123',
      esClient: elasticsearchServiceMock.createElasticsearchClient(
        elasticsearchServiceMock.createSuccessTransportRequestPromise({
          hits: {
            hits: [
              {
                _source: {},
              },
            ],
            total: 1,
          },
        })
      ),
      alertInstance: alertsMock.createAlertInstanceFactory(),
      notificationRuleParams,
    });

    expect(scheduleNotificationActions as jest.Mock).not.toHaveBeenCalled();
  });

  it('should pass expected arguments into "scheduleNotificationActions" on success', async () => {
    await scheduleThrottledNotificationActions({
      throttle: '1d',
      startedAt: new Date('2021-08-24T19:19:22.094Z'),
      id: '123',
      kibanaSiemAppUrl: 'http://www.example.com',
      outputIndex: 'output-123',
      ruleId: 'rule-123',
      esClient: elasticsearchServiceMock.createElasticsearchClient(
        elasticsearchServiceMock.createSuccessTransportRequestPromise({
          hits: {
            hits: [
              {
                _source: {
                  test: 123,
                },
              },
            ],
            total: 1,
          },
        })
      ),
      alertInstance: alertsMock.createAlertInstanceFactory(),
      notificationRuleParams,
    });

    expect((scheduleNotificationActions as jest.Mock).mock.calls[0][0].resultsLink).toMatch(
      'http://www.example.com/detections/rules/id/123'
    );
    expect(scheduleNotificationActions).toHaveBeenCalledWith(
      expect.objectContaining({
        signalsCount: 1,
        signals: [{ test: 123 }],
        ruleParams: notificationRuleParams,
      })
    );
  });
});
