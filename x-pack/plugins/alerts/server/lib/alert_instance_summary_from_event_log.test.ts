/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
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
    const instancesLatestStateSummary: RawEventLogAlertsSummary = {
      instances: {},
      errors_state: {},
      last_execution_state: {},
    };
    const instancesCreatedSummary = {
      instances: {},
    };
    const alertInstanceSummary: AlertInstanceSummary = alertInstanceSummaryFromEventLog({
      alert,
      instancesLatestStateSummary,
      instancesCreatedSummary,
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
    const instancesLatestStateSummary: RawEventLogAlertsSummary = {
      instances: {},
      errors_state: {},
      last_execution_state: {},
    };
    const instancesCreatedSummary = {
      instances: {},
    };
    const alertInstanceSummary: AlertInstanceSummary = alertInstanceSummaryFromEventLog({
      alert,
      instancesLatestStateSummary,
      instancesCreatedSummary,
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
    const instancesLatestStateSummary: RawEventLogAlertsSummary = {
      instances: {},
      errors_state: {},
      last_execution_state: {},
    };
    const instancesCreatedSummary = {
      instances: {},
    };
    const alertInstanceSummary: AlertInstanceSummary = alertInstanceSummaryFromEventLog({
      alert,
      instancesLatestStateSummary,
      instancesCreatedSummary,
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
    const instancesLatestStateSummary: RawEventLogAlertsSummary = {
      instances: {},
      errors_state: {},
      last_execution_state: {
        '@timestamp': '2020-06-18T00:00:10.000Z',
      },
    };
    const instancesCreatedSummary = {
      instances: {},
    };
    const alertInstanceSummary: AlertInstanceSummary = alertInstanceSummaryFromEventLog({
      alert,
      instancesLatestStateSummary,
      instancesCreatedSummary,
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
    const instancesLatestStateSummary: RawEventLogAlertsSummary = {
      instances: {},
      errors_state: {
        '@timestamp': '2020-06-18T00:00:10.000Z',
        action: {
          hits: {
            hits: [
              {
                _source: {
                  error: {
                    message: 'oof!',
                  },
                },
              },
            ],
          },
        },
      },
      last_execution_state: {
        max_timestamp: {
          value_as_string: '2020-06-18T00:00:10.000Z',
        },
      },
    };
    const instancesCreatedSummary = {
      instances: {},
    };
    const alertInstanceSummary: AlertInstanceSummary = alertInstanceSummaryFromEventLog({
      alert,
      instancesLatestStateSummary,
      instancesCreatedSummary,
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
    const instancesLatestStateSummary: RawEventLogAlertsSummary = {
      instances: {},
      errors_state: {},
      last_execution_state: {
        '@timestamp': '2020-06-18T00:00:10.000Z',
      },
    };

    const instancesCreatedSummary = {
      instances: {},
    };
    const alertInstanceSummary: AlertInstanceSummary = alertInstanceSummaryFromEventLog({
      alert,
      instancesLatestStateSummary,
      instancesCreatedSummary,
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
    const instancesLatestStateSummary: RawEventLogAlertsSummary = {
      instances: {},
      errors_state: {},
      last_execution_state: {
        '@timestamp': '2020-06-18T00:00:10.000Z',
      },
    };

    const instancesCreatedSummary = {
      instances: {},
    };
    const alertInstanceSummary: AlertInstanceSummary = alertInstanceSummaryFromEventLog({
      alert,
      instancesLatestStateSummary,
      instancesCreatedSummary,
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
    const instancesLatestStateSummary: RawEventLogAlertsSummary = {
      instances: {},
      errors_state: {},
      last_execution_state: {
        '@timestamp': '2020-06-18T00:00:10.000Z',
      },
    };

    const instancesCreatedSummary = {
      instances: {},
    };
    const alertInstanceSummary: AlertInstanceSummary = alertInstanceSummaryFromEventLog({
      alert,
      instancesLatestStateSummary,
      instancesCreatedSummary,
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
    const instancesLatestStateSummary: RawEventLogAlertsSummary = {
      instances: {},
      errors_state: {},
      last_execution_state: {
        '@timestamp': '2020-06-18T00:00:10.000Z',
      },
    };

    const instancesCreatedSummary = {
      instances: {},
    };
    const alertInstanceSummary: AlertInstanceSummary = alertInstanceSummaryFromEventLog({
      alert,
      instancesLatestStateSummary,
      instancesCreatedSummary,
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
    const instancesLatestStateSummary: RawEventLogAlertsSummary = {
      instances: {},
      errors_state: {},
      last_execution_state: {
        '@timestamp': '2020-06-18T00:00:10.000Z',
      },
    };

    const instancesCreatedSummary = {
      instances: {},
    };
    const alertInstanceSummary: AlertInstanceSummary = alertInstanceSummaryFromEventLog({
      alert,
      instancesLatestStateSummary,
      instancesCreatedSummary,
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
    const instancesLatestStateSummary: RawEventLogAlertsSummary = {
      errors_state: {
        doc_count: 0,
        action: {
          hits: {
            total: {
              value: 0,
              relation: 'eq',
            },
            max_score: null,
            hits: [],
          },
        },
      },
      instances: {
        doc_count_error_upper_bound: 0,
        sum_other_doc_count: 0,
        buckets: [
          {
            key: 'instance-1',
            doc_count: 22,
            last_state: {
              doc_count: 21,
              action: {
                hits: {
                  total: {
                    value: 21,
                    relation: 'eq',
                  },
                  max_score: null,
                  hits: [
                    {
                      _index: '.kibana-event-log-8.0.0-000001',
                      _id: 'e233a3cB0UnnGUWTSSgP',
                      _score: null,
                      _source: {
                        '@timestamp': '2021-02-04T07:35:04.144Z',
                        event: {
                          action: 'active-instance',
                        },
                        kibana: {
                          alerting: {
                            action_group_id: 'action group B',
                          },
                        },
                      },
                      sort: [1612424104144],
                    },
                  ],
                },
              },
            },
          },
        ],
      },
      last_execution_state: {
        doc_count: 20,
        max_timestamp: {
          value: 1612424103095,
          value_as_string: '2021-02-04T07:35:03.095Z',
        },
      },
    };

    const instancesCreatedSummary = {
      instances: {
        doc_count_error_upper_bound: 0,
        sum_other_doc_count: 0,
        buckets: [
          {
            key: 'instance-1',
            doc_count: 20,
            instance_created: {
              doc_count: 1,
              max_timestamp: {
                value: 1612422867554,
                value_as_string: '2021-02-04T07:14:27.554Z',
              },
            },
          },
        ],
      },
    };
    const alertInstanceSummary: AlertInstanceSummary = alertInstanceSummaryFromEventLog({
      alert,
      instancesLatestStateSummary,
      instancesCreatedSummary,
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
    const instancesLatestStateSummary: RawEventLogAlertsSummary = {
      instances: {},
      errors_state: {},
      last_execution_state: {
        '@timestamp': '2020-06-18T00:00:10.000Z',
      },
    };

    const instancesCreatedSummary = {
      instances: {},
    };
    const alertInstanceSummary: AlertInstanceSummary = alertInstanceSummaryFromEventLog({
      alert,
      instancesLatestStateSummary,
      instancesCreatedSummary,
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
    const instancesLatestStateSummary: RawEventLogAlertsSummary = {
      instances: {},
      errors_state: {},
      last_execution_state: {
        '@timestamp': '2020-06-18T00:00:10.000Z',
      },
    };

    const instancesCreatedSummary = {
      instances: {},
    };
    const alertInstanceSummary: AlertInstanceSummary = alertInstanceSummaryFromEventLog({
      alert,
      instancesLatestStateSummary,
      instancesCreatedSummary,
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
    const instancesLatestStateSummary: RawEventLogAlertsSummary = {
      instances: {},
      errors_state: {
        doc_count: 0,
        action: {
          hits: {
            total: {
              value: 0,
              relation: 'eq',
            },
            max_score: null,
            hits: [],
          },
        },
      },
      last_execution_state: {
        '@timestamp': '2020-06-18T00:00:10.000Z',
      },
    };

    const instancesCreatedSummary = {
      instances: {},
    };
    const alertInstanceSummary: AlertInstanceSummary = alertInstanceSummaryFromEventLog({
      alert,
      instancesLatestStateSummary,
      instancesCreatedSummary,
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
