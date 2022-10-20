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

    await getSummarizedAlertsFn({ executionUuid: 'abc', ruleId: 'rule-id', spaceId: 'space-id' });
    expect(ruleDataClientMock.getReader).toHaveBeenCalledWith({ namespace: 'space-id' });
  });

  it('creates function that does not use namespace to getReader if useNamespace is false', async () => {
    const getSummarizedAlertsFn = createGetSummarizedAlertsFn({
      ruleDataClient: ruleDataClientMock,
      useNamespace: false,
      isLifecycleAlert: false,
    })();

    await getSummarizedAlertsFn({ executionUuid: 'abc', ruleId: 'rule-id', spaceId: 'space-id' });
    expect(ruleDataClientMock.getReader).toHaveBeenCalledWith();
  });

  it('creates function that correctly returns lifecycle alerts using execution Uuid', async () => {
    ruleDataClientMock.getReader().search.mockResolvedValue({
      hits: {
        hits: [
          {
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
            _source: {
              [TIMESTAMP]: '2020-01-01T12:00:00.000Z',
              [ALERT_RULE_EXECUTION_UUID]: 'abc',
              [ALERT_RULE_UUID]: 'rule-id',
              [EVENT_ACTION]: 'open',
              [ALERT_INSTANCE_ID]: 'TEST_ALERT_4',
              [ALERT_UUID]: 'uuid2',
            },
          },
          {
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
            _source: {
              [TIMESTAMP]: '2020-01-01T12:00:00.000Z',
              [ALERT_RULE_EXECUTION_UUID]: 'abc',
              [ALERT_RULE_UUID]: 'rule-id',
              [EVENT_ACTION]: 'active',
              [ALERT_INSTANCE_ID]: 'TEST_ALERT_5',
              [ALERT_UUID]: 'uuid5',
            },
          },
          {
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
    });
    expect(ruleDataClientMock.getReader).toHaveBeenCalledWith();
    expect(ruleDataClientMock.getReader().search).toHaveBeenCalledWith({
      body: {
        size: 10000,
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
            ],
          },
        },
      },
    });
    expect(summarizedAlerts.new.length).toEqual(2);
    expect(summarizedAlerts.ongoing.length).toEqual(3);
    expect(summarizedAlerts.recovered.length).toEqual(1);
    expect(summarizedAlerts.new).toEqual([
      {
        _source: {
          '@timestamp': '2020-01-01T12:00:00.000Z',
          [ALERT_RULE_EXECUTION_UUID]: 'abc',
          [ALERT_RULE_UUID]: 'rule-id',
          [EVENT_ACTION]: 'open',
          [ALERT_INSTANCE_ID]: 'TEST_ALERT_3',
          [ALERT_UUID]: 'uuid1',
        },
      },
      {
        _source: {
          '@timestamp': '2020-01-01T12:00:00.000Z',
          [ALERT_RULE_EXECUTION_UUID]: 'abc',
          [ALERT_RULE_UUID]: 'rule-id',
          [EVENT_ACTION]: 'open',
          [ALERT_INSTANCE_ID]: 'TEST_ALERT_4',
          [ALERT_UUID]: 'uuid2',
        },
      },
    ]);
    expect(summarizedAlerts.ongoing).toEqual([
      {
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
        _source: {
          '@timestamp': '2020-01-01T12:00:00.000Z',
          [ALERT_RULE_EXECUTION_UUID]: 'abc',
          [ALERT_RULE_UUID]: 'rule-id',
          [EVENT_ACTION]: 'active',
          [ALERT_INSTANCE_ID]: 'TEST_ALERT_2',
          [ALERT_UUID]: 'uuid4',
        },
      },
      {
        _source: {
          '@timestamp': '2020-01-01T12:00:00.000Z',
          [ALERT_RULE_EXECUTION_UUID]: 'abc',
          [ALERT_RULE_UUID]: 'rule-id',
          [EVENT_ACTION]: 'active',
          [ALERT_INSTANCE_ID]: 'TEST_ALERT_5',
          [ALERT_UUID]: 'uuid5',
        },
      },
    ]);
    expect(summarizedAlerts.recovered).toEqual([
      {
        _source: {
          '@timestamp': '2020-01-01T12:00:00.000Z',
          [ALERT_RULE_EXECUTION_UUID]: 'abc',
          [ALERT_RULE_UUID]: 'rule-id',
          [EVENT_ACTION]: 'close',
          [ALERT_INSTANCE_ID]: 'TEST_ALERT_9',
          [ALERT_UUID]: 'uuid6',
        },
      },
    ]);
  });

  it('creates function that correctly returns lifecycle alerts using time range', async () => {
    ruleDataClientMock.getReader().search.mockResolvedValue({
      hits: {
        hits: [
          {
            _source: {
              [TIMESTAMP]: '2020-01-01T12:00:00.000Z',
              [ALERT_RULE_EXECUTION_UUID]: 'abc',
              [ALERT_RULE_UUID]: 'rule-id',
              [ALERT_INSTANCE_ID]: 'TEST_ALERT_3',
              [ALERT_UUID]: 'uuid1',
              [ALERT_START]: '2020-01-01T12:00:00.000Z',
            },
          },
          {
            _source: {
              [TIMESTAMP]: '2020-01-01T12:00:00.000Z',
              [ALERT_RULE_EXECUTION_UUID]: 'abc',
              [ALERT_RULE_UUID]: 'rule-id',
              [ALERT_INSTANCE_ID]: 'TEST_ALERT_4',
              [ALERT_UUID]: 'uuid2',
              [ALERT_START]: '2020-01-01T12:00:00.000Z',
            },
          },
          {
            _source: {
              [TIMESTAMP]: '2020-01-01T12:10:00.000Z',
              [ALERT_RULE_EXECUTION_UUID]: 'abc',
              [ALERT_RULE_UUID]: 'rule-id',
              [ALERT_INSTANCE_ID]: 'TEST_ALERT_1',
              [ALERT_UUID]: 'uuid3',
              [ALERT_START]: '2020-01-01T12:10:00.000Z',
            },
          },
          {
            _source: {
              [TIMESTAMP]: '2020-01-01T12:20:00.000Z',
              [ALERT_RULE_EXECUTION_UUID]: 'abc',
              [ALERT_RULE_UUID]: 'rule-id',
              [ALERT_INSTANCE_ID]: 'TEST_ALERT_2',
              [ALERT_UUID]: 'uuid4',
              [ALERT_START]: '2020-01-01T12:00:00.000Z',
            },
          },
          {
            _source: {
              [TIMESTAMP]: '2020-01-01T12:00:00.000Z',
              [ALERT_RULE_EXECUTION_UUID]: 'abc',
              [ALERT_RULE_UUID]: 'rule-id',
              [ALERT_INSTANCE_ID]: 'TEST_ALERT_5',
              [ALERT_UUID]: 'uuid5',
              [ALERT_START]: '2020-01-01T11:00:00.000Z',
            },
          },
          {
            _source: {
              [TIMESTAMP]: '2020-01-01T12:20:00.000Z',
              [ALERT_RULE_EXECUTION_UUID]: 'abc',
              [ALERT_RULE_UUID]: 'rule-id',
              [ALERT_INSTANCE_ID]: 'TEST_ALERT_9',
              [ALERT_UUID]: 'uuid6',
              [ALERT_START]: '2020-01-01T11:00:00.000Z',
              [ALERT_END]: '2020-01-01T12:20:00.000Z',
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
    });
    expect(ruleDataClientMock.getReader).toHaveBeenCalledWith();
    expect(ruleDataClientMock.getReader().search).toHaveBeenCalledWith({
      body: {
        size: 10000,
        query: {
          bool: {
            filter: [
              {
                range: {
                  [TIMESTAMP]: {
                    gte: '2020-01-01T11:00:00.000Z',
                    lte: '2020-01-01T12:25:00.000Z',
                  },
                },
              },
              {
                term: {
                  [ALERT_RULE_UUID]: 'rule-id',
                },
              },
            ],
          },
        },
      },
    });
    expect(summarizedAlerts.new.length).toEqual(3);
    expect(summarizedAlerts.ongoing.length).toEqual(2);
    expect(summarizedAlerts.recovered.length).toEqual(1);
    expect(summarizedAlerts.new).toEqual([
      {
        _source: {
          [TIMESTAMP]: '2020-01-01T12:00:00.000Z',
          [ALERT_RULE_EXECUTION_UUID]: 'abc',
          [ALERT_RULE_UUID]: 'rule-id',
          [ALERT_INSTANCE_ID]: 'TEST_ALERT_3',
          [ALERT_UUID]: 'uuid1',
          [ALERT_START]: '2020-01-01T12:00:00.000Z',
        },
      },
      {
        _source: {
          [TIMESTAMP]: '2020-01-01T12:00:00.000Z',
          [ALERT_RULE_EXECUTION_UUID]: 'abc',
          [ALERT_RULE_UUID]: 'rule-id',
          [ALERT_INSTANCE_ID]: 'TEST_ALERT_4',
          [ALERT_UUID]: 'uuid2',
          [ALERT_START]: '2020-01-01T12:00:00.000Z',
        },
      },
      {
        _source: {
          [TIMESTAMP]: '2020-01-01T12:10:00.000Z',
          [ALERT_RULE_EXECUTION_UUID]: 'abc',
          [ALERT_RULE_UUID]: 'rule-id',
          [ALERT_INSTANCE_ID]: 'TEST_ALERT_1',
          [ALERT_UUID]: 'uuid3',
          [ALERT_START]: '2020-01-01T12:10:00.000Z',
        },
      },
    ]);
    expect(summarizedAlerts.ongoing).toEqual([
      {
        _source: {
          [TIMESTAMP]: '2020-01-01T12:20:00.000Z',
          [ALERT_RULE_EXECUTION_UUID]: 'abc',
          [ALERT_RULE_UUID]: 'rule-id',
          [ALERT_INSTANCE_ID]: 'TEST_ALERT_2',
          [ALERT_UUID]: 'uuid4',
          [ALERT_START]: '2020-01-01T12:00:00.000Z',
        },
      },
      {
        _source: {
          [TIMESTAMP]: '2020-01-01T12:00:00.000Z',
          [ALERT_RULE_EXECUTION_UUID]: 'abc',
          [ALERT_RULE_UUID]: 'rule-id',
          [ALERT_INSTANCE_ID]: 'TEST_ALERT_5',
          [ALERT_UUID]: 'uuid5',
          [ALERT_START]: '2020-01-01T11:00:00.000Z',
        },
      },
    ]);
    expect(summarizedAlerts.recovered).toEqual([
      {
        _source: {
          [TIMESTAMP]: '2020-01-01T12:20:00.000Z',
          [ALERT_RULE_EXECUTION_UUID]: 'abc',
          [ALERT_RULE_UUID]: 'rule-id',
          [ALERT_INSTANCE_ID]: 'TEST_ALERT_9',
          [ALERT_UUID]: 'uuid6',
          [ALERT_START]: '2020-01-01T11:00:00.000Z',
          [ALERT_END]: '2020-01-01T12:20:00.000Z',
        },
      },
    ]);
  });

  it('creates function that correctly returns non-lifecycle alerts using execution Uuid', async () => {
    ruleDataClientMock.getReader().search.mockResolvedValue({
      hits: {
        hits: [
          {
            _source: {
              '@timestamp': '2020-01-01T12:00:00.000Z',
              [ALERT_RULE_EXECUTION_UUID]: 'abc',
              [ALERT_RULE_UUID]: 'rule-id',
              [ALERT_INSTANCE_ID]: 'TEST_ALERT_3',
              [ALERT_UUID]: 'uuid1',
            },
          },
          {
            _source: {
              '@timestamp': '2020-01-01T12:00:00.000Z',
              [ALERT_RULE_EXECUTION_UUID]: 'abc',
              [ALERT_RULE_UUID]: 'rule-id',
              [ALERT_INSTANCE_ID]: 'TEST_ALERT_4',
              [ALERT_UUID]: 'uuid2',
            },
          },
          {
            _source: {
              '@timestamp': '2020-01-01T12:00:00.000Z',
              [ALERT_RULE_EXECUTION_UUID]: 'abc',
              [ALERT_RULE_UUID]: 'rule-id',
              [ALERT_INSTANCE_ID]: 'TEST_ALERT_1',
              [ALERT_UUID]: 'uuid3',
            },
          },
          {
            _source: {
              '@timestamp': '2020-01-01T12:00:00.000Z',
              [ALERT_RULE_EXECUTION_UUID]: 'abc',
              [ALERT_RULE_UUID]: 'rule-id',
              [ALERT_INSTANCE_ID]: 'TEST_ALERT_2',
              [ALERT_UUID]: 'uuid4',
            },
          },
          {
            _source: {
              '@timestamp': '2020-01-01T12:00:00.000Z',
              [ALERT_RULE_EXECUTION_UUID]: 'abc',
              [ALERT_RULE_UUID]: 'rule-id',
              [EVENT_ACTION]: 'active',
              [ALERT_INSTANCE_ID]: 'TEST_ALERT_5',
              [ALERT_UUID]: 'uuid5',
            },
          },
          {
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
    });
    expect(ruleDataClientMock.getReader).toHaveBeenCalledWith({ namespace: 'space-id' });
    expect(ruleDataClientMock.getReader().search).toHaveBeenCalledWith({
      body: {
        size: 10000,
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
            ],
          },
        },
      },
    });
    expect(summarizedAlerts.new.length).toEqual(6);
    expect(summarizedAlerts.ongoing.length).toEqual(0);
    expect(summarizedAlerts.recovered.length).toEqual(0);
    expect(summarizedAlerts.new).toEqual([
      {
        _source: {
          '@timestamp': '2020-01-01T12:00:00.000Z',
          [ALERT_RULE_EXECUTION_UUID]: 'abc',
          [ALERT_RULE_UUID]: 'rule-id',
          [ALERT_INSTANCE_ID]: 'TEST_ALERT_3',
          [ALERT_UUID]: 'uuid1',
        },
      },
      {
        _source: {
          '@timestamp': '2020-01-01T12:00:00.000Z',
          [ALERT_RULE_EXECUTION_UUID]: 'abc',
          [ALERT_RULE_UUID]: 'rule-id',
          [ALERT_INSTANCE_ID]: 'TEST_ALERT_4',
          [ALERT_UUID]: 'uuid2',
        },
      },
      {
        _source: {
          '@timestamp': '2020-01-01T12:00:00.000Z',
          [ALERT_RULE_EXECUTION_UUID]: 'abc',
          [ALERT_RULE_UUID]: 'rule-id',
          [ALERT_INSTANCE_ID]: 'TEST_ALERT_1',
          [ALERT_UUID]: 'uuid3',
        },
      },
      {
        _source: {
          '@timestamp': '2020-01-01T12:00:00.000Z',
          [ALERT_RULE_EXECUTION_UUID]: 'abc',
          [ALERT_RULE_UUID]: 'rule-id',
          [ALERT_INSTANCE_ID]: 'TEST_ALERT_2',
          [ALERT_UUID]: 'uuid4',
        },
      },
      {
        _source: {
          '@timestamp': '2020-01-01T12:00:00.000Z',
          [ALERT_RULE_EXECUTION_UUID]: 'abc',
          [ALERT_RULE_UUID]: 'rule-id',
          [EVENT_ACTION]: 'active',
          [ALERT_INSTANCE_ID]: 'TEST_ALERT_5',
          [ALERT_UUID]: 'uuid5',
        },
      },
      {
        _source: {
          '@timestamp': '2020-01-01T12:00:00.000Z',
          [ALERT_RULE_EXECUTION_UUID]: 'abc',
          [ALERT_RULE_UUID]: 'rule-id',
          [ALERT_INSTANCE_ID]: 'TEST_ALERT_9',
          [ALERT_UUID]: 'uuid6',
        },
      },
    ]);
    expect(summarizedAlerts.ongoing).toEqual([]);
    expect(summarizedAlerts.recovered).toEqual([]);
  });

  it('creates function that correctly returns non-lifecycle alerts using time range', async () => {
    ruleDataClientMock.getReader().search.mockResolvedValue({
      hits: {
        hits: [
          {
            _source: {
              [TIMESTAMP]: '2020-01-01T12:00:00.000Z',
              [ALERT_RULE_EXECUTION_UUID]: 'abc',
              [ALERT_RULE_UUID]: 'rule-id',
              [ALERT_INSTANCE_ID]: 'TEST_ALERT_3',
              [ALERT_UUID]: 'uuid1',
            },
          },
          {
            _source: {
              [TIMESTAMP]: '2020-01-01T12:00:00.000Z',
              [ALERT_RULE_EXECUTION_UUID]: 'abc',
              [ALERT_RULE_UUID]: 'rule-id',
              [ALERT_INSTANCE_ID]: 'TEST_ALERT_4',
              [ALERT_UUID]: 'uuid2',
            },
          },
          {
            _source: {
              [TIMESTAMP]: '2020-01-01T12:10:00.000Z',
              [ALERT_RULE_EXECUTION_UUID]: 'abc',
              [ALERT_RULE_UUID]: 'rule-id',
              [ALERT_INSTANCE_ID]: 'TEST_ALERT_1',
              [ALERT_UUID]: 'uuid3',
            },
          },
          {
            _source: {
              [TIMESTAMP]: '2020-01-01T12:20:00.000Z',
              [ALERT_RULE_EXECUTION_UUID]: 'abc',
              [ALERT_RULE_UUID]: 'rule-id',
              [ALERT_INSTANCE_ID]: 'TEST_ALERT_2',
              [ALERT_UUID]: 'uuid4',
            },
          },
          {
            _source: {
              [TIMESTAMP]: '2020-01-01T12:00:00.000Z',
              [ALERT_RULE_EXECUTION_UUID]: 'abc',
              [ALERT_RULE_UUID]: 'rule-id',
              [ALERT_INSTANCE_ID]: 'TEST_ALERT_5',
              [ALERT_UUID]: 'uuid5',
            },
          },
          {
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
    });
    expect(ruleDataClientMock.getReader).toHaveBeenCalledWith({ namespace: 'space-id' });
    expect(ruleDataClientMock.getReader().search).toHaveBeenCalledWith({
      body: {
        size: 10000,
        query: {
          bool: {
            filter: [
              {
                range: {
                  [TIMESTAMP]: {
                    gte: '2020-01-01T11:00:00.000Z',
                    lte: '2020-01-01T12:25:00.000Z',
                  },
                },
              },
              {
                term: {
                  [ALERT_RULE_UUID]: 'rule-id',
                },
              },
            ],
          },
        },
      },
    });
    expect(summarizedAlerts.new.length).toEqual(6);
    expect(summarizedAlerts.ongoing.length).toEqual(0);
    expect(summarizedAlerts.recovered.length).toEqual(0);
    expect(summarizedAlerts.new).toEqual([
      {
        _source: {
          [TIMESTAMP]: '2020-01-01T12:00:00.000Z',
          [ALERT_RULE_EXECUTION_UUID]: 'abc',
          [ALERT_RULE_UUID]: 'rule-id',
          [ALERT_INSTANCE_ID]: 'TEST_ALERT_3',
          [ALERT_UUID]: 'uuid1',
        },
      },
      {
        _source: {
          [TIMESTAMP]: '2020-01-01T12:00:00.000Z',
          [ALERT_RULE_EXECUTION_UUID]: 'abc',
          [ALERT_RULE_UUID]: 'rule-id',
          [ALERT_INSTANCE_ID]: 'TEST_ALERT_4',
          [ALERT_UUID]: 'uuid2',
        },
      },
      {
        _source: {
          [TIMESTAMP]: '2020-01-01T12:10:00.000Z',
          [ALERT_RULE_EXECUTION_UUID]: 'abc',
          [ALERT_RULE_UUID]: 'rule-id',
          [ALERT_INSTANCE_ID]: 'TEST_ALERT_1',
          [ALERT_UUID]: 'uuid3',
        },
      },
      {
        _source: {
          [TIMESTAMP]: '2020-01-01T12:20:00.000Z',
          [ALERT_RULE_EXECUTION_UUID]: 'abc',
          [ALERT_RULE_UUID]: 'rule-id',
          [ALERT_INSTANCE_ID]: 'TEST_ALERT_2',
          [ALERT_UUID]: 'uuid4',
        },
      },
      {
        _source: {
          [TIMESTAMP]: '2020-01-01T12:00:00.000Z',
          [ALERT_RULE_EXECUTION_UUID]: 'abc',
          [ALERT_RULE_UUID]: 'rule-id',
          [ALERT_INSTANCE_ID]: 'TEST_ALERT_5',
          [ALERT_UUID]: 'uuid5',
        },
      },
      {
        _source: {
          [TIMESTAMP]: '2020-01-01T12:20:00.000Z',
          [ALERT_RULE_EXECUTION_UUID]: 'abc',
          [ALERT_RULE_UUID]: 'rule-id',
          [ALERT_INSTANCE_ID]: 'TEST_ALERT_9',
          [ALERT_UUID]: 'uuid6',
        },
      },
    ]);
    expect(summarizedAlerts.ongoing).toEqual([]);
    expect(summarizedAlerts.recovered).toEqual([]);
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
      getSummarizedAlertsFn({ executionUuid: 'abc', ruleId: 'rule-id', spaceId: 'space-id' })
    ).rejects.toThrowErrorMatchingInlineSnapshot(`"search error"`);
  });

  it('throws error if start, end and execution UUID are not defined', async () => {
    const getSummarizedAlertsFn = createGetSummarizedAlertsFn({
      ruleDataClient: ruleDataClientMock,
      useNamespace: true,
      isLifecycleAlert: false,
    })();

    await expect(
      getSummarizedAlertsFn({ ruleId: 'rule-id', spaceId: 'space-id' })
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
      getSummarizedAlertsFn({ start: new Date(), ruleId: 'rule-id', spaceId: 'space-id' })
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
      getSummarizedAlertsFn({ end: new Date(), ruleId: 'rule-id', spaceId: 'space-id' })
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
