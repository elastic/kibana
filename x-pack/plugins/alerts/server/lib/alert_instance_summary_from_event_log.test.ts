/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SanitizedAlert, AlertInstanceSummary } from '../types';
import {
  alertInstanceSummaryFromEventLog,
  RawEventLogAlertsSummary,
} from './alert_instance_summary_from_event_log';

const ONE_HOUR_IN_MILLIS = 60 * 60 * 1000;
const dateStart = '2020-06-18T00:00:00.000Z';
const dateEnd = dateString(dateStart, ONE_HOUR_IN_MILLIS);

describe('alertInstanceSummaryFromEventLog', () => {
  test('no events and muted ids', async () => {
    const alert = createAlert({});
    const summary: RawEventLogAlertsSummary = { instances: {}, last_execution_state: {} };
    const alertInstanceSummary: AlertInstanceSummary = alertInstanceSummaryFromEventLog({
      alert,
      summary,
      dateStart,
      dateEnd,
    });

    expect(alertInstanceSummary).toMatchInlineSnapshot(`
      Object {
        "alertTypeId": "123",
        "consumer": "alert-consumer",
        "enabled": false,
        "errorMessages": Array [],
        "id": "alert-123",
        "instances": Object {},
        "lastRun": undefined,
        "muteAll": false,
        "name": "alert-name",
        "status": "OK",
        "statusEndDate": "2020-06-18T01:00:00.000Z",
        "statusStartDate": "2020-06-18T00:00:00.000Z",
        "tags": Array [],
        "throttle": null,
      }
    `);
  });

  test('different alert properties', async () => {
    const alert = createAlert({
      id: 'alert-456',
      alertTypeId: '456',
      schedule: { interval: '100s' },
      enabled: true,
      name: 'alert-name-2',
      tags: ['tag-1', 'tag-2'],
      consumer: 'alert-consumer-2',
      throttle: '1h',
      muteAll: true,
    });
    const summary: RawEventLogAlertsSummary = { instances: {}, last_execution_state: {} };
    const alertInstanceSummary: AlertInstanceSummary = alertInstanceSummaryFromEventLog({
      alert,
      summary,
      dateStart: dateString(dateEnd, ONE_HOUR_IN_MILLIS),
      dateEnd: dateString(dateEnd, ONE_HOUR_IN_MILLIS * 2),
    });

    expect(alertInstanceSummary).toMatchInlineSnapshot(`
      Object {
        "alertTypeId": "456",
        "consumer": "alert-consumer-2",
        "enabled": true,
        "errorMessages": Array [],
        "id": "alert-456",
        "instances": Object {},
        "lastRun": undefined,
        "muteAll": true,
        "name": "alert-name-2",
        "status": "OK",
        "statusEndDate": "2020-06-18T03:00:00.000Z",
        "statusStartDate": "2020-06-18T02:00:00.000Z",
        "tags": Array [
          "tag-1",
          "tag-2",
        ],
        "throttle": "1h",
      }
    `);
  });

  test('two muted instances', async () => {
    const alert = createAlert({
      mutedInstanceIds: ['instance-1', 'instance-2'],
    });
    const summary: RawEventLogAlertsSummary = { instances: {}, last_execution_state: {} };
    const alertInstanceSummary: AlertInstanceSummary = alertInstanceSummaryFromEventLog({
      alert,
      summary,
      dateStart,
      dateEnd,
    });

    const { lastRun, status, instances } = alertInstanceSummary;
    expect({ lastRun, status, instances }).toMatchInlineSnapshot(`
      Object {
        "instances": Object {
          "instance-1": Object {
            "actionGroupId": undefined,
            "actionSubgroup": undefined,
            "activeStartDate": undefined,
            "muted": true,
            "status": "OK",
          },
          "instance-2": Object {
            "actionGroupId": undefined,
            "actionSubgroup": undefined,
            "activeStartDate": undefined,
            "muted": true,
            "status": "OK",
          },
        },
        "lastRun": undefined,
        "status": "OK",
      }
    `);
  });

  test('active alert but no instances', async () => {
    const alert = createAlert({});
    const summary: RawEventLogAlertsSummary = {
      instances: {},
      last_execution_state: {
        '@timestamp': '2020-06-18T00:00:10.000Z',
      },
    };

    const alertInstanceSummary: AlertInstanceSummary = alertInstanceSummaryFromEventLog({
      alert,
      summary,
      dateStart,
      dateEnd,
    });

    const { lastRun, status, instances } = alertInstanceSummary;
    expect({ lastRun, status, instances }).toMatchInlineSnapshot(`
      Object {
        "instances": Object {},
        "lastRun": "2020-06-18T00:00:10.000Z",
        "status": "OK",
      }
    `);
  });

  test('active alert with no instances but has errors', async () => {
    const alert = createAlert({});
    const summary: RawEventLogAlertsSummary = {
      instances: {},
      last_execution_state: {
        '@timestamp': '2020-06-18T00:00:10.000Z',
      },
    };
    const alertInstanceSummary: AlertInstanceSummary = alertInstanceSummaryFromEventLog({
      alert,
      summary,
      dateStart,
      dateEnd,
    });

    const { lastRun, status, errorMessages, instances } = alertInstanceSummary;
    expect({ lastRun, status, errorMessages, instances }).toMatchInlineSnapshot(`
      Object {
        "errorMessages": Array [
          Object {
            "date": "2020-06-18T00:00:00.000Z",
            "message": "oof!",
          },
          Object {
            "date": "2020-06-18T00:00:10.000Z",
            "message": "rut roh!",
          },
        ],
        "instances": Object {},
        "lastRun": "2020-06-18T00:00:10.000Z",
        "status": "Error",
      }
    `);
  });

  test('alert with currently inactive instance', async () => {
    const alert = createAlert({});
    const summary: RawEventLogAlertsSummary = {
      instances: {},
      last_execution_state: {
        '@timestamp': '2020-06-18T00:00:10.000Z',
      },
    };

    const alertInstanceSummary: AlertInstanceSummary = alertInstanceSummaryFromEventLog({
      alert,
      summary,
      dateStart,
      dateEnd,
    });

    const { lastRun, status, instances } = alertInstanceSummary;
    expect({ lastRun, status, instances }).toMatchInlineSnapshot(`
      Object {
        "instances": Object {
          "instance-1": Object {
            "actionGroupId": undefined,
            "actionSubgroup": undefined,
            "activeStartDate": undefined,
            "muted": false,
            "status": "OK",
          },
        },
        "lastRun": "2020-06-18T00:00:10.000Z",
        "status": "OK",
      }
    `);
  });

  test('legacy alert with currently inactive instance', async () => {
    const alert = createAlert({});
    const summary: RawEventLogAlertsSummary = {
      instances: {},
      last_execution_state: {
        '@timestamp': '2020-06-18T00:00:10.000Z',
      },
    };

    const alertInstanceSummary: AlertInstanceSummary = alertInstanceSummaryFromEventLog({
      alert,
      summary,
      dateStart,
      dateEnd,
    });

    const { lastRun, status, instances } = alertInstanceSummary;
    expect({ lastRun, status, instances }).toMatchInlineSnapshot(`
      Object {
        "instances": Object {
          "instance-1": Object {
            "actionGroupId": undefined,
            "actionSubgroup": undefined,
            "activeStartDate": undefined,
            "muted": false,
            "status": "OK",
          },
        },
        "lastRun": "2020-06-18T00:00:10.000Z",
        "status": "OK",
      }
    `);
  });

  test('alert with currently inactive instance, no new-instance', async () => {
    const alert = createAlert({});
    const summary: RawEventLogAlertsSummary = {
      instances: {},
      last_execution_state: {
        '@timestamp': '2020-06-18T00:00:10.000Z',
      },
    };

    const alertInstanceSummary: AlertInstanceSummary = alertInstanceSummaryFromEventLog({
      alert,
      summary,
      dateStart,
      dateEnd,
    });

    const { lastRun, status, instances } = alertInstanceSummary;
    expect({ lastRun, status, instances }).toMatchInlineSnapshot(`
      Object {
        "instances": Object {
          "instance-1": Object {
            "actionGroupId": undefined,
            "actionSubgroup": undefined,
            "activeStartDate": undefined,
            "muted": false,
            "status": "OK",
          },
        },
        "lastRun": "2020-06-18T00:00:10.000Z",
        "status": "OK",
      }
    `);
  });

  test('alert with currently active instance', async () => {
    const alert = createAlert({});
    const summary: RawEventLogAlertsSummary = {
      instances: {},
      last_execution_state: {
        '@timestamp': '2020-06-18T00:00:10.000Z',
      },
    };

    const alertInstanceSummary: AlertInstanceSummary = alertInstanceSummaryFromEventLog({
      alert,
      summary,
      dateStart,
      dateEnd,
    });

    const { lastRun, status, instances } = alertInstanceSummary;
    expect({ lastRun, status, instances }).toMatchInlineSnapshot(`
      Object {
        "instances": Object {
          "instance-1": Object {
            "actionGroupId": "action group A",
            "actionSubgroup": undefined,
            "activeStartDate": "2020-06-18T00:00:00.000Z",
            "muted": false,
            "status": "Active",
          },
        },
        "lastRun": "2020-06-18T00:00:10.000Z",
        "status": "Active",
      }
    `);
  });

  test('alert with currently active instance with no action group in event log', async () => {
    const alert = createAlert({});
    const summary: RawEventLogAlertsSummary = {
      instances: {},
      last_execution_state: {
        '@timestamp': '2020-06-18T00:00:10.000Z',
      },
    };

    const alertInstanceSummary: AlertInstanceSummary = alertInstanceSummaryFromEventLog({
      alert,
      summary,
      dateStart,
      dateEnd,
    });

    const { lastRun, status, instances } = alertInstanceSummary;
    expect({ lastRun, status, instances }).toMatchInlineSnapshot(`
      Object {
        "instances": Object {
          "instance-1": Object {
            "actionGroupId": undefined,
            "actionSubgroup": undefined,
            "activeStartDate": "2020-06-18T00:00:00.000Z",
            "muted": false,
            "status": "Active",
          },
        },
        "lastRun": "2020-06-18T00:00:10.000Z",
        "status": "Active",
      }
    `);
  });

  test('alert with currently active instance that switched action groups', async () => {
    const alert = createAlert({});
    const summary: RawEventLogAlertsSummary = {
      instances: {
        buckets: [
          {
            key: 'host-11',
            doc_count: 49,
            last_state: {
              doc_count: 49,
              action: {
                hits: {
                  total: {
                    value: 49,
                    relation: 'eq',
                  },
                  max_score: null,
                  hits: [
                    {
                      _index: '.kibana-event-log-8.0.0-000001',
                      _id: 'hvR9ZncBZvAf3rflOD0w',
                      _score: null,
                      _source: {
                        '@timestamp': '2021-02-03T06:03:38.212Z',
                        event: {
                          action: 'active-instance',
                        },
                        kibana: {
                          alerting: {
                            action_group_id: 'threshold met',
                          },
                        },
                      },
                      sort: [1612332218212],
                    },
                  ],
                },
              },
            },
            instance_created: {
              doc_count: 0,
              max_timestampt: {
                value: null,
              },
            },
          },
        ],
      },
      last_execution_state: {
        doc_count: 48,
        action: {
          hits: {
            total: {
              value: 48,
              relation: 'eq',
            },
            max_score: null,
            hits: [
              {
                _index: '.kibana-event-log-8.0.0-000001',
                _id: 'jvR9ZncBZvAf3rflOD0w',
                _score: null,
                _source: {
                  '@timestamp': '2021-02-03T06:03:38.194Z',
                },
                sort: [1612332218194],
              },
            ],
          },
        },
      },
    };

    const alertInstanceSummary: AlertInstanceSummary = alertInstanceSummaryFromEventLog({
      alert,
      summary,
      dateStart,
      dateEnd,
    });

    const { lastRun, status, instances } = alertInstanceSummary;
    expect({ lastRun, status, instances }).toMatchInlineSnapshot(`
      Object {
        "instances": Object {
          "instance-1": Object {
            "actionGroupId": "action group B",
            "actionSubgroup": undefined,
            "activeStartDate": "2020-06-18T00:00:00.000Z",
            "muted": false,
            "status": "Active",
          },
        },
        "lastRun": "2020-06-18T00:00:10.000Z",
        "status": "Active",
      }
    `);
  });

  test('alert with currently active instance, no new-instance', async () => {
    const alert = createAlert({});
    const summary: RawEventLogAlertsSummary = {
      instances: {},
      last_execution_state: {
        '@timestamp': '2020-06-18T00:00:10.000Z',
      },
    };

    const alertInstanceSummary: AlertInstanceSummary = alertInstanceSummaryFromEventLog({
      alert,
      summary,
      dateStart,
      dateEnd,
    });

    const { lastRun, status, instances } = alertInstanceSummary;
    expect({ lastRun, status, instances }).toMatchInlineSnapshot(`
      Object {
        "instances": Object {
          "instance-1": Object {
            "actionGroupId": "action group A",
            "actionSubgroup": undefined,
            "activeStartDate": undefined,
            "muted": false,
            "status": "Active",
          },
        },
        "lastRun": "2020-06-18T00:00:10.000Z",
        "status": "Active",
      }
    `);
  });

  test('alert with active and inactive muted alerts', async () => {
    const alert = createAlert({ mutedInstanceIds: ['instance-1', 'instance-2'] });
    const summary: RawEventLogAlertsSummary = {
      instances: {},
      last_execution_state: {
        '@timestamp': '2020-06-18T00:00:10.000Z',
      },
    };

    const alertInstanceSummary: AlertInstanceSummary = alertInstanceSummaryFromEventLog({
      alert,
      summary,
      dateStart,
      dateEnd,
    });

    const { lastRun, status, instances } = alertInstanceSummary;
    expect({ lastRun, status, instances }).toMatchInlineSnapshot(`
      Object {
        "instances": Object {
          "instance-1": Object {
            "actionGroupId": "action group A",
            "actionSubgroup": undefined,
            "activeStartDate": "2020-06-18T00:00:00.000Z",
            "muted": true,
            "status": "Active",
          },
          "instance-2": Object {
            "actionGroupId": undefined,
            "actionSubgroup": undefined,
            "activeStartDate": undefined,
            "muted": true,
            "status": "OK",
          },
        },
        "lastRun": "2020-06-18T00:00:10.000Z",
        "status": "Active",
      }
    `);
  });

  test('alert with active and inactive alerts over many executes', async () => {
    const alert = createAlert({});
    const summary: RawEventLogAlertsSummary = {
      instances: {},
      last_execution_state: {
        '@timestamp': '2020-06-18T00:00:10.000Z',
      },
    };

    const alertInstanceSummary: AlertInstanceSummary = alertInstanceSummaryFromEventLog({
      alert,
      summary,
      dateStart,
      dateEnd,
    });

    const { lastRun, status, instances } = alertInstanceSummary;
    expect({ lastRun, status, instances }).toMatchInlineSnapshot(`
      Object {
        "instances": Object {
          "instance-1": Object {
            "actionGroupId": "action group B",
            "actionSubgroup": undefined,
            "activeStartDate": "2020-06-18T00:00:00.000Z",
            "muted": false,
            "status": "Active",
          },
          "instance-2": Object {
            "actionGroupId": undefined,
            "actionSubgroup": undefined,
            "activeStartDate": undefined,
            "muted": false,
            "status": "OK",
          },
        },
        "lastRun": "2020-06-18T00:00:30.000Z",
        "status": "Active",
      }
    `);
  });
});

function dateString(isoBaseDate: string, offsetMillis = 0): string {
  return new Date(Date.parse(isoBaseDate) + offsetMillis).toISOString();
}

function createAlert(overrides: Partial<SanitizedAlert>): SanitizedAlert<{ bar: boolean }> {
  return { ...BaseAlert, ...overrides };
}

const BaseAlert: SanitizedAlert<{ bar: boolean }> = {
  id: 'alert-123',
  alertTypeId: '123',
  schedule: { interval: '10s' },
  enabled: false,
  name: 'alert-name',
  tags: [],
  consumer: 'alert-consumer',
  throttle: null,
  notifyWhen: null,
  muteAll: false,
  mutedInstanceIds: [],
  params: { bar: true },
  actions: [],
  createdBy: null,
  updatedBy: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  apiKeyOwner: null,
  executionStatus: {
    status: 'unknown',
    lastExecutionDate: new Date('2020-08-20T19:23:38Z'),
  },
};
