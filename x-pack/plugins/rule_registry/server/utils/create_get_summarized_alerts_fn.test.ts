/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  createRuleDataClientMock,
  RuleDataClientMock,
} from '../rule_data_client/rule_data_client.mock';
import {
  ALERT_END,
  ALERT_INSTANCE_ID,
  ALERT_RULE_EXECUTION_UUID,
  ALERT_RULE_UUID,
  ALERT_START,
  ALERT_UUID,
  EVENT_ACTION,
  TIMESTAMP,
} from '../../common/technical_rule_data_field_names';
import { createGetSummarizedAlertsFn } from './create_get_summarized_alerts_fn';

describe('createGetSummarizedAlertsFn', () => {
  let ruleDataClientMock: RuleDataClientMock;

  beforeEach(() => {
    jest.resetAllMocks();
    ruleDataClientMock = createRuleDataClientMock();
    ruleDataClientMock.getReader().search.mockResolvedValue({
      hits: {
        total: {
          value: 0,
        },
        hits: [],
      },
    } as any);
  });

  it('creates function that uses namespace to getReader if useNamespace is true', async () => {
    const getSummarizedAlertsFn = createGetSummarizedAlertsFn({
      ruleDataClient: ruleDataClientMock,
      useNamespace: true,
      isLifecycleAlert: false,
    })();

    await getSummarizedAlertsFn({
      executionUuid: 'abc',
      ruleId: 'rule-id',
      spaceId: 'space-id',
      excludedAlertInstanceIds: [],
    });
    expect(ruleDataClientMock.getReader).toHaveBeenCalledWith({ namespace: 'space-id' });
  });

  it('creates function that does not use namespace to getReader if useNamespace is false', async () => {
    const getSummarizedAlertsFn = createGetSummarizedAlertsFn({
      ruleDataClient: ruleDataClientMock,
      useNamespace: false,
      isLifecycleAlert: false,
    })();

    await getSummarizedAlertsFn({
      executionUuid: 'abc',
      ruleId: 'rule-id',
      spaceId: 'space-id',
      excludedAlertInstanceIds: [],
    });
    expect(ruleDataClientMock.getReader).toHaveBeenCalledWith();
  });

  it('creates function that correctly returns lifecycle alerts using execution Uuid', async () => {
    ruleDataClientMock.getReader().search.mockResolvedValueOnce({
      hits: {
        total: {
          value: 2,
        },
        hits: [
          {
            _id: '1',
            _index: '.alerts-default-000001',
            _source: {
              [TIMESTAMP]: '2020-01-01T12:00:00.000Z',
              [ALERT_RULE_EXECUTION_UUID]: 'abc',
              [ALERT_RULE_UUID]: 'rule-id',
              [EVENT_ACTION]: 'open',
              [ALERT_INSTANCE_ID]: 'TEST_ALERT_3',
              [ALERT_UUID]: 'uuid1',
            },
          },
          {
            _id: '2',
            _index: '.alerts-default-000001',
            _source: {
              [TIMESTAMP]: '2020-01-01T12:00:00.000Z',
              [ALERT_RULE_EXECUTION_UUID]: 'abc',
              [ALERT_RULE_UUID]: 'rule-id',
              [EVENT_ACTION]: 'open',
              [ALERT_INSTANCE_ID]: 'TEST_ALERT_4',
              [ALERT_UUID]: 'uuid2',
            },
          },
        ],
      },
    } as any);
    ruleDataClientMock.getReader().search.mockResolvedValueOnce({
      hits: {
        total: {
          value: 3,
        },
        hits: [
          {
            _id: '3',
            _index: '.alerts-default-000001',
            _source: {
              '@timestamp': '2020-01-01T12:00:00.000Z',
              [ALERT_RULE_EXECUTION_UUID]: 'abc',
              [ALERT_RULE_UUID]: 'rule-id',
              [EVENT_ACTION]: 'active',
              [ALERT_INSTANCE_ID]: 'TEST_ALERT_1',
              [ALERT_UUID]: 'uuid3',
            },
          },
          {
            _id: '4',
            _index: '.alerts-default-000001',
            _source: {
              [TIMESTAMP]: '2020-01-01T12:00:00.000Z',
              [ALERT_RULE_EXECUTION_UUID]: 'abc',
              [ALERT_RULE_UUID]: 'rule-id',
              [EVENT_ACTION]: 'active',
              [ALERT_INSTANCE_ID]: 'TEST_ALERT_2',
              [ALERT_UUID]: 'uuid4',
            },
          },
          {
            _id: '5',
            _index: '.alerts-default-000001',
            _source: {
              [TIMESTAMP]: '2020-01-01T12:00:00.000Z',
              [ALERT_RULE_EXECUTION_UUID]: 'abc',
              [ALERT_RULE_UUID]: 'rule-id',
              [EVENT_ACTION]: 'active',
              [ALERT_INSTANCE_ID]: 'TEST_ALERT_5',
              [ALERT_UUID]: 'uuid5',
            },
          },
        ],
      },
    } as any);
    ruleDataClientMock.getReader().search.mockResolvedValueOnce({
      hits: {
        total: {
          value: 1,
        },
        hits: [
          {
            _id: '6',
            _index: '.alerts-default-000001',
            _source: {
              '@timestamp': '2020-01-01T12:00:00.000Z',
              [ALERT_RULE_EXECUTION_UUID]: 'abc',
              [ALERT_RULE_UUID]: 'rule-id',
              [EVENT_ACTION]: 'close',
              [ALERT_INSTANCE_ID]: 'TEST_ALERT_9',
              [ALERT_UUID]: 'uuid6',
            },
          },
        ],
      },
    } as any);
    const getSummarizedAlertsFn = createGetSummarizedAlertsFn({
      ruleDataClient: ruleDataClientMock,
      useNamespace: false,
      isLifecycleAlert: true,
    })();

    const summarizedAlerts = await getSummarizedAlertsFn({
      executionUuid: 'abc',
      ruleId: 'rule-id',
      spaceId: 'space-id',
      excludedAlertInstanceIds: ['TEST_ALERT_10'],
    });
    expect(ruleDataClientMock.getReader).toHaveBeenCalledWith();
    expect(ruleDataClientMock.getReader().search).toHaveBeenCalledTimes(3);
    expect(ruleDataClientMock.getReader().search).toHaveBeenNthCalledWith(1, {
      body: {
        size: 100,
        track_total_hits: true,
        query: {
          bool: {
            filter: [
              {
                term: {
                  [ALERT_RULE_EXECUTION_UUID]: 'abc',
                },
              },
              {
                term: {
                  [ALERT_RULE_UUID]: 'rule-id',
                },
              },
              {
                term: {
                  [EVENT_ACTION]: 'open',
                },
              },
              {
                bool: {
                  must_not: {
                    terms: {
                      [ALERT_INSTANCE_ID]: ['TEST_ALERT_10'],
                    },
                  },
                },
              },
            ],
          },
        },
      },
    });
    expect(ruleDataClientMock.getReader().search).toHaveBeenNthCalledWith(2, {
      body: {
        size: 100,
        track_total_hits: true,
        query: {
          bool: {
            filter: [
              {
                term: {
                  [ALERT_RULE_EXECUTION_UUID]: 'abc',
                },
              },
              {
                term: {
                  [ALERT_RULE_UUID]: 'rule-id',
                },
              },
              {
                term: {
                  [EVENT_ACTION]: 'active',
                },
              },
              {
                bool: {
                  must_not: {
                    terms: {
                      [ALERT_INSTANCE_ID]: ['TEST_ALERT_10'],
                    },
                  },
                },
              },
            ],
          },
        },
      },
    });
    expect(ruleDataClientMock.getReader().search).toHaveBeenNthCalledWith(3, {
      body: {
        size: 100,
        track_total_hits: true,
        query: {
          bool: {
            filter: [
              {
                term: {
                  [ALERT_RULE_EXECUTION_UUID]: 'abc',
                },
              },
              {
                term: {
                  [ALERT_RULE_UUID]: 'rule-id',
                },
              },
              {
                term: {
                  [EVENT_ACTION]: 'close',
                },
              },
              {
                bool: {
                  must_not: {
                    terms: {
                      [ALERT_INSTANCE_ID]: ['TEST_ALERT_10'],
                    },
                  },
                },
              },
            ],
          },
        },
      },
    });
    expect(summarizedAlerts.new.count).toEqual(2);
    expect(summarizedAlerts.ongoing.count).toEqual(3);
    expect(summarizedAlerts.recovered.count).toEqual(1);
    expect(summarizedAlerts.new.data).toEqual([
      {
        _id: '1',
        _index: '.alerts-default-000001',
        '@timestamp': '2020-01-01T12:00:00.000Z',
        event: {
          action: 'open',
        },
        kibana: {
          alert: {
            instance: {
              id: 'TEST_ALERT_3',
            },
            rule: {
              execution: {
                uuid: 'abc',
              },
              uuid: 'rule-id',
            },
            uuid: 'uuid1',
          },
        },
      },
      {
        _id: '2',
        _index: '.alerts-default-000001',
        '@timestamp': '2020-01-01T12:00:00.000Z',
        event: {
          action: 'open',
        },
        kibana: {
          alert: {
            instance: {
              id: 'TEST_ALERT_4',
            },
            rule: {
              execution: {
                uuid: 'abc',
              },
              uuid: 'rule-id',
            },
            uuid: 'uuid2',
          },
        },
      },
    ]);
    expect(summarizedAlerts.ongoing.data).toEqual([
      {
        _id: '3',
        _index: '.alerts-default-000001',
        '@timestamp': '2020-01-01T12:00:00.000Z',
        event: {
          action: 'active',
        },
        kibana: {
          alert: {
            instance: {
              id: 'TEST_ALERT_1',
            },
            rule: {
              execution: {
                uuid: 'abc',
              },
              uuid: 'rule-id',
            },
            uuid: 'uuid3',
          },
        },
      },
      {
        _id: '4',
        _index: '.alerts-default-000001',
        '@timestamp': '2020-01-01T12:00:00.000Z',
        event: {
          action: 'active',
        },
        kibana: {
          alert: {
            instance: {
              id: 'TEST_ALERT_2',
            },
            rule: {
              execution: {
                uuid: 'abc',
              },
              uuid: 'rule-id',
            },
            uuid: 'uuid4',
          },
        },
      },
      {
        _id: '5',
        _index: '.alerts-default-000001',
        '@timestamp': '2020-01-01T12:00:00.000Z',
        event: {
          action: 'active',
        },
        kibana: {
          alert: {
            instance: {
              id: 'TEST_ALERT_5',
            },
            rule: {
              execution: {
                uuid: 'abc',
              },
              uuid: 'rule-id',
            },
            uuid: 'uuid5',
          },
        },
      },
    ]);
    expect(summarizedAlerts.recovered.data).toEqual([
      {
        _id: '6',
        _index: '.alerts-default-000001',
        '@timestamp': '2020-01-01T12:00:00.000Z',
        event: {
          action: 'close',
        },
        kibana: {
          alert: {
            instance: {
              id: 'TEST_ALERT_9',
            },
            rule: {
              execution: {
                uuid: 'abc',
              },
              uuid: 'rule-id',
            },
            uuid: 'uuid6',
          },
        },
      },
    ]);
  });

  it('creates function that correctly returns lifecycle alerts using time range', async () => {
    ruleDataClientMock.getReader().search.mockResolvedValueOnce({
      hits: {
        total: {
          value: 3,
        },
        hits: [
          {
            _id: '1',
            _index: '.alerts-default-000001',
            _source: {
              [TIMESTAMP]: '2020-01-01T12:00:00.000Z',
              [ALERT_RULE_EXECUTION_UUID]: 'abc',
              [ALERT_RULE_UUID]: 'rule-id',
              [ALERT_INSTANCE_ID]: 'TEST_ALERT_3',
              [ALERT_UUID]: 'uuid1',
              [ALERT_START]: '2020-01-01T12:00:00.000Z',
              alert_type: 'new',
            },
          },
          {
            _id: '2',
            _index: '.alerts-default-000001',
            _source: {
              [TIMESTAMP]: '2020-01-01T12:00:00.000Z',
              [ALERT_RULE_EXECUTION_UUID]: 'abc',
              [ALERT_RULE_UUID]: 'rule-id',
              [ALERT_INSTANCE_ID]: 'TEST_ALERT_4',
              [ALERT_UUID]: 'uuid2',
              [ALERT_START]: '2020-01-01T12:00:00.000Z',
              alert_type: 'new',
            },
          },
          {
            _id: '3',
            _index: '.alerts-default-000001',
            _source: {
              [TIMESTAMP]: '2020-01-01T12:10:00.000Z',
              [ALERT_RULE_EXECUTION_UUID]: 'abc',
              [ALERT_RULE_UUID]: 'rule-id',
              [ALERT_INSTANCE_ID]: 'TEST_ALERT_1',
              [ALERT_UUID]: 'uuid3',
              [ALERT_START]: '2020-01-01T12:10:00.000Z',
              alert_type: 'new',
            },
          },
        ],
      },
    } as any);
    ruleDataClientMock.getReader().search.mockResolvedValueOnce({
      hits: {
        total: {
          value: 2,
        },
        hits: [
          {
            _id: '4',
            _index: '.alerts-default-000001',
            _source: {
              [TIMESTAMP]: '2020-01-01T12:20:00.000Z',
              [ALERT_RULE_EXECUTION_UUID]: 'abc',
              [ALERT_RULE_UUID]: 'rule-id',
              [ALERT_INSTANCE_ID]: 'TEST_ALERT_2',
              [ALERT_UUID]: 'uuid4',
              [ALERT_START]: '2020-01-01T12:00:00.000Z',
              alert_type: 'ongoing',
            },
          },
          {
            _id: '5',
            _index: '.alerts-default-000001',
            _source: {
              [TIMESTAMP]: '2020-01-01T12:00:00.000Z',
              [ALERT_RULE_EXECUTION_UUID]: 'abc',
              [ALERT_RULE_UUID]: 'rule-id',
              [ALERT_INSTANCE_ID]: 'TEST_ALERT_5',
              [ALERT_UUID]: 'uuid5',
              [ALERT_START]: '2020-01-01T11:00:00.000Z',
              alert_type: 'ongoing',
            },
          },
        ],
      },
    } as any);
    ruleDataClientMock.getReader().search.mockResolvedValueOnce({
      hits: {
        total: {
          value: 1,
        },
        hits: [
          {
            _id: '6',
            _index: '.alerts-default-000001',
            _source: {
              [TIMESTAMP]: '2020-01-01T12:20:00.000Z',
              [ALERT_RULE_EXECUTION_UUID]: 'abc',
              [ALERT_RULE_UUID]: 'rule-id',
              [ALERT_INSTANCE_ID]: 'TEST_ALERT_9',
              [ALERT_UUID]: 'uuid6',
              [ALERT_START]: '2020-01-01T11:00:00.000Z',
              [ALERT_END]: '2020-01-01T12:20:00.000Z',
              alert_type: 'recovered',
            },
          },
        ],
      },
    } as any);
    const getSummarizedAlertsFn = createGetSummarizedAlertsFn({
      ruleDataClient: ruleDataClientMock,
      useNamespace: false,
      isLifecycleAlert: true,
    })();

    const summarizedAlerts = await getSummarizedAlertsFn({
      start: new Date('2020-01-01T11:00:00.000Z'),
      end: new Date('2020-01-01T12:25:00.000Z'),
      ruleId: 'rule-id',
      spaceId: 'space-id',
      excludedAlertInstanceIds: ['TEST_ALERT_10'],
    });
    expect(ruleDataClientMock.getReader).toHaveBeenCalledWith();
    expect(ruleDataClientMock.getReader().search).toHaveBeenCalledTimes(3);
    expect(ruleDataClientMock.getReader().search).toHaveBeenNthCalledWith(1, {
      body: {
        size: 100,
        track_total_hits: true,
        query: {
          bool: {
            filter: [
              {
                range: {
                  [TIMESTAMP]: {
                    gte: '2020-01-01T11:00:00.000Z',
                    lt: '2020-01-01T12:25:00.000Z',
                  },
                },
              },
              {
                term: {
                  [ALERT_RULE_UUID]: 'rule-id',
                },
              },
              {
                bool: {
                  must_not: {
                    terms: {
                      [ALERT_INSTANCE_ID]: ['TEST_ALERT_10'],
                    },
                  },
                },
              },
              {
                range: {
                  [ALERT_START]: {
                    gte: '2020-01-01T11:00:00.000Z',
                  },
                },
              },
            ],
          },
        },
      },
    });
    expect(ruleDataClientMock.getReader().search).toHaveBeenNthCalledWith(2, {
      body: {
        size: 100,
        track_total_hits: true,
        query: {
          bool: {
            filter: [
              {
                range: {
                  [TIMESTAMP]: {
                    gte: '2020-01-01T11:00:00.000Z',
                    lt: '2020-01-01T12:25:00.000Z',
                  },
                },
              },
              {
                term: {
                  [ALERT_RULE_UUID]: 'rule-id',
                },
              },
              {
                bool: {
                  must_not: {
                    terms: {
                      [ALERT_INSTANCE_ID]: ['TEST_ALERT_10'],
                    },
                  },
                },
              },
              {
                range: {
                  [ALERT_START]: {
                    lt: '2020-01-01T11:00:00.000Z',
                  },
                },
              },
              {
                bool: {
                  must_not: {
                    exists: {
                      field: ALERT_END,
                    },
                  },
                },
              },
            ],
          },
        },
      },
    });
    expect(ruleDataClientMock.getReader().search).toHaveBeenNthCalledWith(3, {
      body: {
        size: 100,
        track_total_hits: true,
        query: {
          bool: {
            filter: [
              {
                range: {
                  [TIMESTAMP]: {
                    gte: '2020-01-01T11:00:00.000Z',
                    lt: '2020-01-01T12:25:00.000Z',
                  },
                },
              },
              {
                term: {
                  [ALERT_RULE_UUID]: 'rule-id',
                },
              },
              {
                bool: {
                  must_not: {
                    terms: {
                      [ALERT_INSTANCE_ID]: ['TEST_ALERT_10'],
                    },
                  },
                },
              },
              {
                range: {
                  [ALERT_END]: {
                    gte: '2020-01-01T11:00:00.000Z',
                    lt: '2020-01-01T12:25:00.000Z',
                  },
                },
              },
            ],
          },
        },
      },
    });
    expect(summarizedAlerts.new.count).toEqual(3);
    expect(summarizedAlerts.ongoing.count).toEqual(2);
    expect(summarizedAlerts.recovered.count).toEqual(1);
    expect(summarizedAlerts.new.data).toEqual([
      {
        _id: '1',
        _index: '.alerts-default-000001',
        [TIMESTAMP]: '2020-01-01T12:00:00.000Z',
        alert_type: 'new',
        kibana: {
          alert: {
            instance: {
              id: 'TEST_ALERT_3',
            },
            rule: {
              execution: {
                uuid: 'abc',
              },
              uuid: 'rule-id',
            },
            start: '2020-01-01T12:00:00.000Z',
            uuid: 'uuid1',
          },
        },
      },
      {
        _id: '2',
        _index: '.alerts-default-000001',
        [TIMESTAMP]: '2020-01-01T12:00:00.000Z',
        alert_type: 'new',
        kibana: {
          alert: {
            instance: {
              id: 'TEST_ALERT_4',
            },
            rule: {
              execution: {
                uuid: 'abc',
              },
              uuid: 'rule-id',
            },
            start: '2020-01-01T12:00:00.000Z',
            uuid: 'uuid2',
          },
        },
      },
      {
        _id: '3',
        _index: '.alerts-default-000001',
        [TIMESTAMP]: '2020-01-01T12:10:00.000Z',
        alert_type: 'new',
        kibana: {
          alert: {
            instance: {
              id: 'TEST_ALERT_1',
            },
            rule: {
              execution: {
                uuid: 'abc',
              },
              uuid: 'rule-id',
            },
            start: '2020-01-01T12:10:00.000Z',
            uuid: 'uuid3',
          },
        },
      },
    ]);
    expect(summarizedAlerts.ongoing.data).toEqual([
      {
        _id: '4',
        _index: '.alerts-default-000001',
        [TIMESTAMP]: '2020-01-01T12:20:00.000Z',
        alert_type: 'ongoing',
        kibana: {
          alert: {
            instance: {
              id: 'TEST_ALERT_2',
            },
            rule: {
              execution: {
                uuid: 'abc',
              },
              uuid: 'rule-id',
            },
            start: '2020-01-01T12:00:00.000Z',
            uuid: 'uuid4',
          },
        },
      },
      {
        _id: '5',
        _index: '.alerts-default-000001',
        [TIMESTAMP]: '2020-01-01T12:00:00.000Z',
        alert_type: 'ongoing',
        kibana: {
          alert: {
            instance: {
              id: 'TEST_ALERT_5',
            },
            rule: {
              execution: {
                uuid: 'abc',
              },
              uuid: 'rule-id',
            },
            start: '2020-01-01T11:00:00.000Z',
            uuid: 'uuid5',
          },
        },
      },
    ]);
    expect(summarizedAlerts.recovered.data).toEqual([
      {
        _id: '6',
        _index: '.alerts-default-000001',
        [TIMESTAMP]: '2020-01-01T12:20:00.000Z',
        alert_type: 'recovered',
        kibana: {
          alert: {
            end: '2020-01-01T12:20:00.000Z',
            instance: {
              id: 'TEST_ALERT_9',
            },
            rule: {
              execution: {
                uuid: 'abc',
              },
              uuid: 'rule-id',
            },
            start: '2020-01-01T11:00:00.000Z',
            uuid: 'uuid6',
          },
        },
      },
    ]);
  });

  it('creates function that correctly returns non-lifecycle alerts using execution Uuid', async () => {
    ruleDataClientMock.getReader().search.mockResolvedValueOnce({
      hits: {
        total: {
          value: 6,
        },
        hits: [
          {
            _id: '1',
            _index: '.alerts-default-000001',
            _source: {
              '@timestamp': '2020-01-01T12:00:00.000Z',
              [ALERT_RULE_EXECUTION_UUID]: 'abc',
              [ALERT_RULE_UUID]: 'rule-id',
              [ALERT_INSTANCE_ID]: 'TEST_ALERT_3',
              [ALERT_UUID]: 'uuid1',
            },
          },
          {
            _id: '2',
            _index: '.alerts-default-000001',
            _source: {
              '@timestamp': '2020-01-01T12:00:00.000Z',
              [ALERT_RULE_EXECUTION_UUID]: 'abc',
              [ALERT_RULE_UUID]: 'rule-id',
              [ALERT_INSTANCE_ID]: 'TEST_ALERT_4',
              [ALERT_UUID]: 'uuid2',
            },
          },
          {
            _id: '3',
            _index: '.alerts-default-000001',
            _source: {
              '@timestamp': '2020-01-01T12:00:00.000Z',
              [ALERT_RULE_EXECUTION_UUID]: 'abc',
              [ALERT_RULE_UUID]: 'rule-id',
              [ALERT_INSTANCE_ID]: 'TEST_ALERT_1',
              [ALERT_UUID]: 'uuid3',
            },
          },
          {
            _id: '4',
            _index: '.alerts-default-000001',
            _source: {
              '@timestamp': '2020-01-01T12:00:00.000Z',
              [ALERT_RULE_EXECUTION_UUID]: 'abc',
              [ALERT_RULE_UUID]: 'rule-id',
              [ALERT_INSTANCE_ID]: 'TEST_ALERT_2',
              [ALERT_UUID]: 'uuid4',
            },
          },
          {
            _id: '5',
            _index: '.alerts-default-000001',
            _source: {
              '@timestamp': '2020-01-01T12:00:00.000Z',
              [ALERT_RULE_EXECUTION_UUID]: 'abc',
              [ALERT_RULE_UUID]: 'rule-id',
              [ALERT_INSTANCE_ID]: 'TEST_ALERT_5',
              [ALERT_UUID]: 'uuid5',
            },
          },
          {
            _id: '6',
            _index: '.alerts-default-000001',
            _source: {
              '@timestamp': '2020-01-01T12:00:00.000Z',
              [ALERT_RULE_EXECUTION_UUID]: 'abc',
              [ALERT_RULE_UUID]: 'rule-id',
              [ALERT_INSTANCE_ID]: 'TEST_ALERT_9',
              [ALERT_UUID]: 'uuid6',
            },
          },
        ],
      },
    } as any);
    const getSummarizedAlertsFn = createGetSummarizedAlertsFn({
      ruleDataClient: ruleDataClientMock,
      useNamespace: true,
      isLifecycleAlert: false,
    })();

    const summarizedAlerts = await getSummarizedAlertsFn({
      executionUuid: 'abc',
      ruleId: 'rule-id',
      spaceId: 'space-id',
      excludedAlertInstanceIds: ['TEST_ALERT_10'],
    });
    expect(ruleDataClientMock.getReader).toHaveBeenCalledWith({ namespace: 'space-id' });
    expect(ruleDataClientMock.getReader().search).toHaveBeenCalledTimes(1);
    expect(ruleDataClientMock.getReader().search).toHaveBeenCalledWith({
      body: {
        size: 100,
        track_total_hits: true,
        query: {
          bool: {
            filter: [
              {
                term: {
                  [ALERT_RULE_EXECUTION_UUID]: 'abc',
                },
              },
              {
                term: {
                  [ALERT_RULE_UUID]: 'rule-id',
                },
              },
              {
                bool: {
                  must_not: {
                    terms: {
                      [ALERT_INSTANCE_ID]: ['TEST_ALERT_10'],
                    },
                  },
                },
              },
            ],
          },
        },
      },
    });
    expect(summarizedAlerts.new.count).toEqual(6);
    expect(summarizedAlerts.ongoing.count).toEqual(0);
    expect(summarizedAlerts.recovered.count).toEqual(0);
    expect(summarizedAlerts.new.data).toEqual([
      {
        _id: '1',
        _index: '.alerts-default-000001',
        [TIMESTAMP]: '2020-01-01T12:00:00.000Z',
        kibana: {
          alert: {
            instance: {
              id: 'TEST_ALERT_3',
            },
            rule: {
              execution: {
                uuid: 'abc',
              },
              uuid: 'rule-id',
            },
            uuid: 'uuid1',
          },
        },
      },
      {
        _id: '2',
        _index: '.alerts-default-000001',
        [TIMESTAMP]: '2020-01-01T12:00:00.000Z',
        kibana: {
          alert: {
            instance: {
              id: 'TEST_ALERT_4',
            },
            rule: {
              execution: {
                uuid: 'abc',
              },
              uuid: 'rule-id',
            },
            uuid: 'uuid2',
          },
        },
      },
      {
        _id: '3',
        _index: '.alerts-default-000001',
        [TIMESTAMP]: '2020-01-01T12:00:00.000Z',
        kibana: {
          alert: {
            instance: {
              id: 'TEST_ALERT_1',
            },
            rule: {
              execution: {
                uuid: 'abc',
              },
              uuid: 'rule-id',
            },
            uuid: 'uuid3',
          },
        },
      },
      {
        _id: '4',
        _index: '.alerts-default-000001',
        [TIMESTAMP]: '2020-01-01T12:00:00.000Z',
        kibana: {
          alert: {
            instance: {
              id: 'TEST_ALERT_2',
            },
            rule: {
              execution: {
                uuid: 'abc',
              },
              uuid: 'rule-id',
            },
            uuid: 'uuid4',
          },
        },
      },
      {
        _id: '5',
        _index: '.alerts-default-000001',
        [TIMESTAMP]: '2020-01-01T12:00:00.000Z',
        kibana: {
          alert: {
            instance: {
              id: 'TEST_ALERT_5',
            },
            rule: {
              execution: {
                uuid: 'abc',
              },
              uuid: 'rule-id',
            },
            uuid: 'uuid5',
          },
        },
      },
      {
        _id: '6',
        _index: '.alerts-default-000001',
        [TIMESTAMP]: '2020-01-01T12:00:00.000Z',
        kibana: {
          alert: {
            instance: {
              id: 'TEST_ALERT_9',
            },
            rule: {
              execution: {
                uuid: 'abc',
              },
              uuid: 'rule-id',
            },
            uuid: 'uuid6',
          },
        },
      },
    ]);
    expect(summarizedAlerts.ongoing.data).toEqual([]);
    expect(summarizedAlerts.recovered.data).toEqual([]);
  });

  it('creates function that correctly returns non-lifecycle alerts using time range', async () => {
    ruleDataClientMock.getReader().search.mockResolvedValueOnce({
      hits: {
        total: {
          value: 6,
        },
        hits: [
          {
            _id: '1',
            _index: '.alerts-default-000001',
            _source: {
              [TIMESTAMP]: '2020-01-01T12:00:00.000Z',
              [ALERT_RULE_EXECUTION_UUID]: 'abc',
              [ALERT_RULE_UUID]: 'rule-id',
              [ALERT_INSTANCE_ID]: 'TEST_ALERT_3',
              [ALERT_UUID]: 'uuid1',
            },
          },
          {
            _id: '2',
            _index: '.alerts-default-000001',
            _source: {
              [TIMESTAMP]: '2020-01-01T12:00:00.000Z',
              [ALERT_RULE_EXECUTION_UUID]: 'abc',
              [ALERT_RULE_UUID]: 'rule-id',
              [ALERT_INSTANCE_ID]: 'TEST_ALERT_4',
              [ALERT_UUID]: 'uuid2',
            },
          },
          {
            _id: '3',
            _index: '.alerts-default-000001',
            _source: {
              [TIMESTAMP]: '2020-01-01T12:10:00.000Z',
              [ALERT_RULE_EXECUTION_UUID]: 'abc',
              [ALERT_RULE_UUID]: 'rule-id',
              [ALERT_INSTANCE_ID]: 'TEST_ALERT_1',
              [ALERT_UUID]: 'uuid3',
            },
          },
          {
            _id: '4',
            _index: '.alerts-default-000001',
            _source: {
              [TIMESTAMP]: '2020-01-01T12:20:00.000Z',
              [ALERT_RULE_EXECUTION_UUID]: 'abc',
              [ALERT_RULE_UUID]: 'rule-id',
              [ALERT_INSTANCE_ID]: 'TEST_ALERT_2',
              [ALERT_UUID]: 'uuid4',
            },
          },
          {
            _id: '5',
            _index: '.alerts-default-000001',
            _source: {
              [TIMESTAMP]: '2020-01-01T12:00:00.000Z',
              [ALERT_RULE_EXECUTION_UUID]: 'abc',
              [ALERT_RULE_UUID]: 'rule-id',
              [ALERT_INSTANCE_ID]: 'TEST_ALERT_5',
              [ALERT_UUID]: 'uuid5',
            },
          },
          {
            _id: '6',
            _index: '.alerts-default-000001',
            _source: {
              [TIMESTAMP]: '2020-01-01T12:20:00.000Z',
              [ALERT_RULE_EXECUTION_UUID]: 'abc',
              [ALERT_RULE_UUID]: 'rule-id',
              [ALERT_INSTANCE_ID]: 'TEST_ALERT_9',
              [ALERT_UUID]: 'uuid6',
            },
          },
        ],
      },
    } as any);
    const getSummarizedAlertsFn = createGetSummarizedAlertsFn({
      ruleDataClient: ruleDataClientMock,
      useNamespace: true,
      isLifecycleAlert: false,
    })();

    const summarizedAlerts = await getSummarizedAlertsFn({
      start: new Date('2020-01-01T11:00:00.000Z'),
      end: new Date('2020-01-01T12:25:00.000Z'),
      ruleId: 'rule-id',
      spaceId: 'space-id',
      excludedAlertInstanceIds: ['TEST_ALERT_10'],
    });
    expect(ruleDataClientMock.getReader).toHaveBeenCalledWith({ namespace: 'space-id' });
    expect(ruleDataClientMock.getReader().search).toHaveBeenCalledTimes(1);
    expect(ruleDataClientMock.getReader().search).toHaveBeenCalledWith({
      body: {
        size: 100,
        track_total_hits: true,
        query: {
          bool: {
            filter: [
              {
                range: {
                  [TIMESTAMP]: {
                    gte: '2020-01-01T11:00:00.000Z',
                    lt: '2020-01-01T12:25:00.000Z',
                  },
                },
              },
              {
                term: {
                  [ALERT_RULE_UUID]: 'rule-id',
                },
              },
              {
                bool: {
                  must_not: {
                    terms: {
                      [ALERT_INSTANCE_ID]: ['TEST_ALERT_10'],
                    },
                  },
                },
              },
            ],
          },
        },
      },
    });
    expect(summarizedAlerts.new.count).toEqual(6);
    expect(summarizedAlerts.ongoing.count).toEqual(0);
    expect(summarizedAlerts.recovered.count).toEqual(0);
    expect(summarizedAlerts.new.data).toEqual([
      {
        _id: '1',
        _index: '.alerts-default-000001',
        [TIMESTAMP]: '2020-01-01T12:00:00.000Z',
        kibana: {
          alert: {
            instance: {
              id: 'TEST_ALERT_3',
            },
            rule: {
              execution: {
                uuid: 'abc',
              },
              uuid: 'rule-id',
            },
            uuid: 'uuid1',
          },
        },
      },
      {
        _id: '2',
        _index: '.alerts-default-000001',
        [TIMESTAMP]: '2020-01-01T12:00:00.000Z',
        kibana: {
          alert: {
            instance: {
              id: 'TEST_ALERT_4',
            },
            rule: {
              execution: {
                uuid: 'abc',
              },
              uuid: 'rule-id',
            },
            uuid: 'uuid2',
          },
        },
      },
      {
        _id: '3',
        _index: '.alerts-default-000001',
        [TIMESTAMP]: '2020-01-01T12:10:00.000Z',
        kibana: {
          alert: {
            instance: {
              id: 'TEST_ALERT_1',
            },
            rule: {
              execution: {
                uuid: 'abc',
              },
              uuid: 'rule-id',
            },
            uuid: 'uuid3',
          },
        },
      },
      {
        _id: '4',
        _index: '.alerts-default-000001',
        [TIMESTAMP]: '2020-01-01T12:20:00.000Z',
        kibana: {
          alert: {
            instance: {
              id: 'TEST_ALERT_2',
            },
            rule: {
              execution: {
                uuid: 'abc',
              },
              uuid: 'rule-id',
            },
            uuid: 'uuid4',
          },
        },
      },
      {
        _id: '5',
        _index: '.alerts-default-000001',
        [TIMESTAMP]: '2020-01-01T12:00:00.000Z',
        kibana: {
          alert: {
            instance: {
              id: 'TEST_ALERT_5',
            },
            rule: {
              execution: {
                uuid: 'abc',
              },
              uuid: 'rule-id',
            },
            uuid: 'uuid5',
          },
        },
      },
      {
        _id: '6',
        _index: '.alerts-default-000001',
        [TIMESTAMP]: '2020-01-01T12:20:00.000Z',
        kibana: {
          alert: {
            instance: {
              id: 'TEST_ALERT_9',
            },
            rule: {
              execution: {
                uuid: 'abc',
              },
              uuid: 'rule-id',
            },
            uuid: 'uuid6',
          },
        },
      },
    ]);
    expect(summarizedAlerts.ongoing.data).toEqual([]);
    expect(summarizedAlerts.recovered.data).toEqual([]);
  });

  it('creates function that correctly formats alerts', async () => {
    ruleDataClientMock.getReader().search.mockResolvedValueOnce({
      hits: {
        total: {
          value: 6,
        },
        hits: [
          {
            _id: '1',
            _index: '.alerts-default-000001',
            _source: {
              [TIMESTAMP]: '2020-01-01T12:00:00.000Z',
              [ALERT_RULE_EXECUTION_UUID]: 'abc',
              [ALERT_RULE_UUID]: 'rule-id',
              [ALERT_INSTANCE_ID]: 'TEST_ALERT_3',
              [ALERT_UUID]: 'uuid1',
              kibana: {
                alert: {
                  instance: {
                    id: 'TEST_ALERT_3',
                  },
                  rule: {
                    execution: {
                      uuid: 'abc',
                    },
                  },
                  uuid: 'uuid1',
                },
              },
            },
          },
          {
            _id: '2',
            _index: '.alerts-default-000001',
            _source: {
              [TIMESTAMP]: '2020-01-01T12:00:00.000Z',
              [ALERT_RULE_EXECUTION_UUID]: 'abc',
              [ALERT_RULE_UUID]: 'rule-id',
              [ALERT_INSTANCE_ID]: 'TEST_ALERT_4',
              [ALERT_UUID]: 'uuid2',
              kibana: {
                alert: {
                  instance: {
                    id: 'TEST_ALERT_4',
                  },
                  rule: {
                    execution: {
                      uuid: 'abc',
                    },
                  },
                  uuid: 'uuid2',
                },
              },
            },
          },
          {
            _id: '3',
            _index: '.alerts-default-000001',
            _source: {
              [TIMESTAMP]: '2020-01-01T12:10:00.000Z',
              [ALERT_RULE_EXECUTION_UUID]: 'abc',
              [ALERT_RULE_UUID]: 'rule-id',
              [ALERT_INSTANCE_ID]: 'TEST_ALERT_1',
              [ALERT_UUID]: 'uuid3',
              kibana: {
                alert: {
                  instance: {
                    id: 'TEST_ALERT_1',
                  },
                  rule: {
                    execution: {
                      uuid: 'abc',
                    },
                  },
                  uuid: 'uuid3',
                },
              },
            },
          },
          {
            _id: '4',
            _index: '.alerts-default-000001',
            _source: {
              [TIMESTAMP]: '2020-01-01T12:20:00.000Z',
              [ALERT_RULE_EXECUTION_UUID]: 'abc',
              [ALERT_RULE_UUID]: 'rule-id',
              [ALERT_INSTANCE_ID]: 'TEST_ALERT_2',
              [ALERT_UUID]: 'uuid4',
              kibana: {
                alert: {
                  instance: {
                    id: 'TEST_ALERT_2',
                  },
                  rule: {
                    execution: {
                      uuid: 'abc',
                    },
                  },
                  uuid: 'uuid4',
                },
              },
            },
          },
          {
            _id: '5',
            _index: '.alerts-default-000001',
            _source: {
              [TIMESTAMP]: '2020-01-01T12:00:00.000Z',
              [ALERT_RULE_EXECUTION_UUID]: 'abc',
              [ALERT_RULE_UUID]: 'rule-id',
              [ALERT_INSTANCE_ID]: 'TEST_ALERT_5',
              [ALERT_UUID]: 'uuid5',
              kibana: {
                alert: {
                  instance: {
                    id: 'TEST_ALERT_5',
                  },
                  rule: {
                    execution: {
                      uuid: 'abc',
                    },
                  },
                  uuid: 'uuid5',
                },
              },
            },
          },
          {
            _id: '6',
            _index: '.alerts-default-000001',
            _source: {
              [TIMESTAMP]: '2020-01-01T12:20:00.000Z',
              [ALERT_RULE_EXECUTION_UUID]: 'abc',
              [ALERT_RULE_UUID]: 'rule-id',
              [ALERT_INSTANCE_ID]: 'TEST_ALERT_9',
              [ALERT_UUID]: 'uuid6',
              kibana: {
                alert: {
                  instance: {
                    id: 'TEST_ALERT_9',
                  },
                  rule: {
                    execution: {
                      uuid: 'abc',
                    },
                  },
                  uuid: 'uuid6',
                },
              },
            },
          },
        ],
      },
    } as any);
    const getSummarizedAlertsFn = createGetSummarizedAlertsFn({
      ruleDataClient: ruleDataClientMock,
      useNamespace: true,
      isLifecycleAlert: false,
    })();

    const summarizedAlerts = await getSummarizedAlertsFn({
      start: new Date('2020-01-01T11:00:00.000Z'),
      end: new Date('2020-01-01T12:25:00.000Z'),
      ruleId: 'rule-id',
      spaceId: 'space-id',
      excludedAlertInstanceIds: ['TEST_ALERT_10'],
    });
    expect(ruleDataClientMock.getReader).toHaveBeenCalledWith({ namespace: 'space-id' });
    expect(ruleDataClientMock.getReader().search).toHaveBeenCalledTimes(1);
    expect(ruleDataClientMock.getReader().search).toHaveBeenCalledWith({
      body: {
        size: 100,
        track_total_hits: true,
        query: {
          bool: {
            filter: [
              {
                range: {
                  [TIMESTAMP]: {
                    gte: '2020-01-01T11:00:00.000Z',
                    lt: '2020-01-01T12:25:00.000Z',
                  },
                },
              },
              {
                term: {
                  [ALERT_RULE_UUID]: 'rule-id',
                },
              },
              {
                bool: {
                  must_not: {
                    terms: {
                      [ALERT_INSTANCE_ID]: ['TEST_ALERT_10'],
                    },
                  },
                },
              },
            ],
          },
        },
      },
    });
    expect(summarizedAlerts.new.count).toEqual(6);
    expect(summarizedAlerts.ongoing.count).toEqual(0);
    expect(summarizedAlerts.recovered.count).toEqual(0);
    expect(summarizedAlerts.new.data).toEqual([
      {
        _id: '1',
        _index: '.alerts-default-000001',
        [TIMESTAMP]: '2020-01-01T12:00:00.000Z',
        kibana: {
          alert: {
            instance: {
              id: 'TEST_ALERT_3',
            },
            rule: {
              execution: {
                uuid: 'abc',
              },
              uuid: 'rule-id',
            },
            uuid: 'uuid1',
          },
        },
      },
      {
        _id: '2',
        _index: '.alerts-default-000001',
        [TIMESTAMP]: '2020-01-01T12:00:00.000Z',
        kibana: {
          alert: {
            instance: {
              id: 'TEST_ALERT_4',
            },
            rule: {
              execution: {
                uuid: 'abc',
              },
              uuid: 'rule-id',
            },
            uuid: 'uuid2',
          },
        },
      },
      {
        _id: '3',
        _index: '.alerts-default-000001',
        [TIMESTAMP]: '2020-01-01T12:10:00.000Z',
        kibana: {
          alert: {
            instance: {
              id: 'TEST_ALERT_1',
            },
            rule: {
              execution: {
                uuid: 'abc',
              },
              uuid: 'rule-id',
            },
            uuid: 'uuid3',
          },
        },
      },
      {
        _id: '4',
        _index: '.alerts-default-000001',
        [TIMESTAMP]: '2020-01-01T12:20:00.000Z',
        kibana: {
          alert: {
            instance: {
              id: 'TEST_ALERT_2',
            },
            rule: {
              execution: {
                uuid: 'abc',
              },
              uuid: 'rule-id',
            },
            uuid: 'uuid4',
          },
        },
      },
      {
        _id: '5',
        _index: '.alerts-default-000001',
        [TIMESTAMP]: '2020-01-01T12:00:00.000Z',
        kibana: {
          alert: {
            instance: {
              id: 'TEST_ALERT_5',
            },
            rule: {
              execution: {
                uuid: 'abc',
              },
              uuid: 'rule-id',
            },
            uuid: 'uuid5',
          },
        },
      },
      {
        _id: '6',
        _index: '.alerts-default-000001',
        [TIMESTAMP]: '2020-01-01T12:20:00.000Z',
        kibana: {
          alert: {
            instance: {
              id: 'TEST_ALERT_9',
            },
            rule: {
              execution: {
                uuid: 'abc',
              },
              uuid: 'rule-id',
            },
            uuid: 'uuid6',
          },
        },
      },
    ]);
    expect(summarizedAlerts.ongoing.data).toEqual([]);
    expect(summarizedAlerts.recovered.data).toEqual([]);
  });

  it('throws error if search throws error', async () => {
    ruleDataClientMock.getReader().search.mockImplementation(() => {
      throw new Error('search error');
    });
    const getSummarizedAlertsFn = createGetSummarizedAlertsFn({
      ruleDataClient: ruleDataClientMock,
      useNamespace: true,
      isLifecycleAlert: false,
    })();

    await expect(
      getSummarizedAlertsFn({
        executionUuid: 'abc',
        ruleId: 'rule-id',
        spaceId: 'space-id',
        excludedAlertInstanceIds: [],
      })
    ).rejects.toThrowErrorMatchingInlineSnapshot(`"search error"`);
  });

  it('throws error if start, end and execution UUID are not defined', async () => {
    const getSummarizedAlertsFn = createGetSummarizedAlertsFn({
      ruleDataClient: ruleDataClientMock,
      useNamespace: true,
      isLifecycleAlert: false,
    })();

    await expect(
      getSummarizedAlertsFn({
        ruleId: 'rule-id',
        spaceId: 'space-id',
        excludedAlertInstanceIds: [],
      })
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Must specify either execution UUID or time range for summarized alert query."`
    );
  });

  it('throws error if start, end and execution UUID are all defined', async () => {
    const getSummarizedAlertsFn = createGetSummarizedAlertsFn({
      ruleDataClient: ruleDataClientMock,
      useNamespace: true,
      isLifecycleAlert: false,
    })();

    await expect(
      getSummarizedAlertsFn({
        executionUuid: 'abc',
        start: new Date(),
        end: new Date(),
        ruleId: 'rule-id',
        spaceId: 'space-id',
        excludedAlertInstanceIds: [],
      })
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Must specify either execution UUID or time range for summarized alert query."`
    );
  });

  it('throws error if start is defined but end is not', async () => {
    const getSummarizedAlertsFn = createGetSummarizedAlertsFn({
      ruleDataClient: ruleDataClientMock,
      useNamespace: true,
      isLifecycleAlert: false,
    })();

    await expect(
      getSummarizedAlertsFn({
        start: new Date(),
        ruleId: 'rule-id',
        spaceId: 'space-id',
        excludedAlertInstanceIds: [],
      })
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Must specify either execution UUID or time range for summarized alert query."`
    );
  });

  it('throws error if end is defined but start is not', async () => {
    const getSummarizedAlertsFn = createGetSummarizedAlertsFn({
      ruleDataClient: ruleDataClientMock,
      useNamespace: true,
      isLifecycleAlert: false,
    })();

    await expect(
      getSummarizedAlertsFn({
        end: new Date(),
        ruleId: 'rule-id',
        spaceId: 'space-id',
        excludedAlertInstanceIds: [],
      })
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Must specify either execution UUID or time range for summarized alert query."`
    );
  });

  it('throws error if ruleId is not defined', async () => {
    const getSummarizedAlertsFn = createGetSummarizedAlertsFn({
      ruleDataClient: ruleDataClientMock,
      useNamespace: true,
      isLifecycleAlert: false,
    })();

    await expect(
      // @ts-expect-error
      getSummarizedAlertsFn({ executionUuid: 'abc', spaceId: 'space-id' })
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Must specify both rule ID and space ID for summarized alert query."`
    );
  });

  it('throws error if spaceId is not defined', async () => {
    const getSummarizedAlertsFn = createGetSummarizedAlertsFn({
      ruleDataClient: ruleDataClientMock,
      useNamespace: true,
      isLifecycleAlert: false,
    })();

    await expect(
      // @ts-expect-error
      getSummarizedAlertsFn({ executionUuid: 'abc', ruleId: 'rule-id' })
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Must specify both rule ID and space ID for summarized alert query."`
    );
  });
});
