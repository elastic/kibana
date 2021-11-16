/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock, loggingSystemMock } from 'src/core/server/mocks';
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
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;

  beforeEach(() => {
    logger = loggingSystemMock.createLogger();
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
      logger,
      signals: [],
    });

    expect(scheduleNotificationActions as jest.Mock).toHaveBeenCalled();
  });

  it('should call "scheduleNotificationActions" if the signals length is 1 or greater', async () => {
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
      logger,
      signals: [
        {
          _id: '123',
          index: '123',
        },
      ],
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
      logger,
      signals: [],
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
      logger,
      signals: [],
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
      logger,
      signals: [],
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

  it('should log debug information when passing through in expected format and no error messages', async () => {
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
      logger,
      signals: [],
    });
    // We only test the first part since it has date math using math
    expect(logger.debug.mock.calls[0][0]).toMatch(
      /The notification throttle resultsLink created is/
    );
    expect(logger.debug.mock.calls[1][0]).toEqual(
      'The notification throttle query result size before deconflicting duplicates is: 1. The notification throttle passed in signals size before deconflicting duplicates is: 0. The deconflicted size and size of the signals sent into throttle notification is: 1. The signals count from results size is: 1. The final signals count being sent to the notification is: 1.'
    );
    // error should not have been called in this case.
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('should log error information if "throttle" is an invalid string', async () => {
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
      logger,
      signals: [],
    });

    expect(logger.error).toHaveBeenCalledWith(
      'The notification throttle "from" and/or "to" range values could not be constructed as valid. Tried to construct the values of "from": now-invalid "to": 2021-08-24T19:19:22.094Z. This will cause a reset of the notification throttle. Expect either missing alert notifications or alert notifications happening earlier than expected. Check your rule with ruleId: "rule-123" for data integrity issues'
    );
  });

  it('should count correctly if it does a deconflict', async () => {
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
                _index: 'index-123',
                _id: 'id-123',
                _source: {
                  test: 123,
                },
              },
              {
                _index: 'index-456',
                _id: 'id-456',
                _source: {
                  test: 456,
                },
              },
            ],
            total: 2,
          },
        })
      ),
      alertInstance: alertsMock.createAlertInstanceFactory(),
      notificationRuleParams,
      logger,
      signals: [
        {
          _index: 'index-456',
          _id: 'id-456',
          test: 456,
        },
      ],
    });
    expect(scheduleNotificationActions).toHaveBeenCalledWith(
      expect.objectContaining({
        signalsCount: 2,
        signals: [
          {
            _id: 'id-456',
            _index: 'index-456',
            test: 456,
          },
          {
            _id: 'id-123',
            _index: 'index-123',
            test: 123,
          },
        ],
        ruleParams: notificationRuleParams,
      })
    );
  });

  it('should count correctly if it does not do a deconflict', async () => {
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
                _index: 'index-123',
                _id: 'id-123',
                _source: {
                  test: 123,
                },
              },
              {
                _index: 'index-456',
                _id: 'id-456',
                _source: {
                  test: 456,
                },
              },
            ],
            total: 2,
          },
        })
      ),
      alertInstance: alertsMock.createAlertInstanceFactory(),
      notificationRuleParams,
      logger,
      signals: [
        {
          _index: 'index-789',
          _id: 'id-789',
          test: 456,
        },
      ],
    });
    expect(scheduleNotificationActions).toHaveBeenCalledWith(
      expect.objectContaining({
        signalsCount: 3,
        signals: [
          {
            _id: 'id-789',
            _index: 'index-789',
            test: 456,
          },
          {
            _id: 'id-123',
            _index: 'index-123',
            test: 123,
          },
          {
            _id: 'id-456',
            _index: 'index-456',
            test: 456,
          },
        ],
        ruleParams: notificationRuleParams,
      })
    );
  });

  it('should count total hit with extra total elements', async () => {
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
                _index: 'index-123',
                _id: 'id-123',
                _source: {
                  test: 123,
                },
              },
            ],
            total: 20, // total can be different from the actual return values so we have to ensure we count these.
          },
        })
      ),
      alertInstance: alertsMock.createAlertInstanceFactory(),
      notificationRuleParams,
      logger,
      signals: [
        {
          _index: 'index-789',
          _id: 'id-789',
          test: 456,
        },
      ],
    });
    expect(scheduleNotificationActions).toHaveBeenCalledWith(
      expect.objectContaining({
        signalsCount: 21,
        signals: [
          {
            _id: 'id-789',
            _index: 'index-789',
            test: 456,
          },
          {
            _id: 'id-123',
            _index: 'index-123',
            test: 123,
          },
        ],
        ruleParams: notificationRuleParams,
      })
    );
  });

  it('should count correctly if it does a deconflict and the total has extra values', async () => {
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
                _index: 'index-123',
                _id: 'id-123',
                _source: {
                  test: 123,
                },
              },
              {
                _index: 'index-456',
                _id: 'id-456',
                _source: {
                  test: 456,
                },
              },
            ],
            total: 20, // total can be different from the actual return values so we have to ensure we count these.
          },
        })
      ),
      alertInstance: alertsMock.createAlertInstanceFactory(),
      notificationRuleParams,
      logger,
      signals: [
        {
          _index: 'index-456',
          _id: 'id-456',
          test: 456,
        },
      ],
    });
    expect(scheduleNotificationActions).toHaveBeenCalledWith(
      expect.objectContaining({
        signalsCount: 20,
        signals: [
          {
            _id: 'id-456',
            _index: 'index-456',
            test: 456,
          },
          {
            _id: 'id-123',
            _index: 'index-123',
            test: 123,
          },
        ],
        ruleParams: notificationRuleParams,
      })
    );
  });

  it('should add extra count element if it has signals added', async () => {
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
                _index: 'index-123',
                _id: 'id-123',
                _source: {
                  test: 123,
                },
              },
              {
                _index: 'index-456',
                _id: 'id-456',
                _source: {
                  test: 456,
                },
              },
            ],
            total: 20, // total can be different from the actual return values so we have to ensure we count these.
          },
        })
      ),
      alertInstance: alertsMock.createAlertInstanceFactory(),
      notificationRuleParams,
      logger,
      signals: [
        {
          _index: 'index-789',
          _id: 'id-789',
          test: 789,
        },
      ],
    });
    expect(scheduleNotificationActions).toHaveBeenCalledWith(
      expect.objectContaining({
        signalsCount: 21, // should be 1 more than the total since we pushed in an extra signal
        signals: [
          {
            _id: 'id-789',
            _index: 'index-789',
            test: 789,
          },
          {
            _id: 'id-123',
            _index: 'index-123',
            test: 123,
          },
          {
            _id: 'id-456',
            _index: 'index-456',
            test: 456,
          },
        ],
        ruleParams: notificationRuleParams,
      })
    );
  });
});
