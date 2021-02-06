/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SanitizedAlert, AlertInstanceSummary } from '../types';
import {
  alertsInstanceSummaryFromEventLog,
  RawEventLogAlertsSummary,
} from './alerts_instance_summary_from_event_log';

const ONE_HOUR_IN_MILLIS = 60 * 60 * 1000;
const dateStart = '2020-06-18T00:00:00.000Z';
const dateEnd = dateString(dateStart, ONE_HOUR_IN_MILLIS);

describe('alertsInstanceSummaryFromEventLog', () => {
  test('no events and muted ids', async () => {
    const alert = createAlert({});
    const instancesLatestStateSummaries: Array<{
      savedObjectId: string;
      summary: RawEventLogAlertsSummary;
    }> = [
      {
        savedObjectId: alert.id,
        summary: {
          instances: {},
          errors_state: {},
          last_execution_state: {},
        },
      },
    ];
    const instancesCreatedSummaries: Array<{
      savedObjectId: string;
      summary: Pick<RawEventLogAlertsSummary, 'instances'>;
    }> = [
      {
        savedObjectId: alert.id,
        summary: {
          instances: {},
        },
      },
    ];
    const alertInstanceSummaries: AlertInstanceSummary[] = alertsInstanceSummaryFromEventLog({
      alerts: [alert],
      instancesLatestStateSummaries,
      instancesCreatedSummaries,
      dateStart,
      dateEnd,
    });

    expect(alertInstanceSummaries).toMatchInlineSnapshot(`
    Array [
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
      },
    ]
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
    const instancesLatestStateSummaries: Array<{
      savedObjectId: string;
      summary: RawEventLogAlertsSummary;
    }> = [
      {
        savedObjectId: alert.id,
        summary: {
          instances: {},
          errors_state: {},
          last_execution_state: {},
        },
      },
    ];
    const instancesCreatedSummaries: Array<{
      savedObjectId: string;
      summary: Pick<RawEventLogAlertsSummary, 'instances'>;
    }> = [
      {
        savedObjectId: alert.id,
        summary: {
          instances: {},
        },
      },
    ];
    const alertInstanceSummaries: AlertInstanceSummary[] = alertsInstanceSummaryFromEventLog({
      alerts: [alert],
      instancesLatestStateSummaries,
      instancesCreatedSummaries,
      dateStart: dateString(dateEnd, ONE_HOUR_IN_MILLIS),
      dateEnd: dateString(dateEnd, ONE_HOUR_IN_MILLIS * 2),
    });

    expect(alertInstanceSummaries).toMatchInlineSnapshot(`
    Array [
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
      },
    ]
    `);
  });

  test('two muted instances', async () => {
    const alert = createAlert({
      mutedInstanceIds: ['instance-1', 'instance-2'],
    });
    const instancesLatestStateSummaries: Array<{
      savedObjectId: string;
      summary: RawEventLogAlertsSummary;
    }> = [
      {
        savedObjectId: alert.id,
        summary: {
          instances: {},
          errors_state: {},
          last_execution_state: {},
        },
      },
    ];
    const instancesCreatedSummaries: Array<{
      savedObjectId: string;
      summary: Pick<RawEventLogAlertsSummary, 'instances'>;
    }> = [
      {
        savedObjectId: alert.id,
        summary: {
          instances: {},
        },
      },
    ];
    const alertInstanceSummaries: AlertInstanceSummary[] = alertsInstanceSummaryFromEventLog({
      alerts: [alert],
      instancesLatestStateSummaries,
      instancesCreatedSummaries,
      dateStart,
      dateEnd,
    });

    const { lastRun, status, instances } = alertInstanceSummaries[0];
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
    const instancesLatestStateSummaries: Array<{
      savedObjectId: string;
      summary: RawEventLogAlertsSummary;
    }> = [
      {
        savedObjectId: alert.id,
        summary: {
          instances: {},
          errors_state: {},
          last_execution_state: {
            max_timestamp: {
              value_as_string: '2020-06-18T00:00:10.000Z',
            },
          },
        },
      },
    ];
    const instancesCreatedSummaries: Array<{
      savedObjectId: string;
      summary: Pick<RawEventLogAlertsSummary, 'instances'>;
    }> = [
      {
        savedObjectId: alert.id,
        summary: {
          instances: {},
        },
      },
    ];
    const alertInstanceSummaries: AlertInstanceSummary[] = alertsInstanceSummaryFromEventLog({
      alerts: [alert],
      instancesLatestStateSummaries,
      instancesCreatedSummaries,
      dateStart,
      dateEnd,
    });

    const { lastRun, status, instances } = alertInstanceSummaries[0];
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
    const instancesLatestStateSummaries: Array<{
      savedObjectId: string;
      summary: RawEventLogAlertsSummary;
    }> = [
      {
        savedObjectId: alert.id,
        summary: {
          instances: {},
          errors_state: {
            doc_count: 2,
            action: {
              hits: {
                hits: [
                  {
                    _source: {
                      '@timestamp': '2020-06-18T00:00:00.000Z',
                      error: {
                        message: 'oof!',
                      },
                    },
                  },
                  {
                    _source: {
                      '@timestamp': '2020-06-18T00:00:10.000Z',
                      error: {
                        message: 'rut roh!',
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
        },
      },
    ];
    const instancesCreatedSummaries: Array<{
      savedObjectId: string;
      summary: Pick<RawEventLogAlertsSummary, 'instances'>;
    }> = [
      {
        savedObjectId: alert.id,
        summary: {
          instances: {},
        },
      },
    ];
    const alertInstanceSummaries: AlertInstanceSummary[] = alertsInstanceSummaryFromEventLog({
      alerts: [alert],
      instancesLatestStateSummaries,
      instancesCreatedSummaries,
      dateStart: dateString(dateEnd, ONE_HOUR_IN_MILLIS),
      dateEnd: dateString(dateEnd, ONE_HOUR_IN_MILLIS * 2),
    });

    const { lastRun, status, errorMessages, instances } = alertInstanceSummaries[0];
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
    const instancesLatestStateSummaries: Array<{
      savedObjectId: string;
      summary: RawEventLogAlertsSummary;
    }> = [
      {
        savedObjectId: alert.id,
        summary: {
          instances: {
            buckets: [
              {
                key: 'instance-1',
                last_state: {
                  action: {
                    hits: {
                      hits: [
                        {
                          _source: {
                            '@timestamp': '2021-02-04T23:20:20.343Z',
                            event: {
                              action: 'recovered-instance',
                            },
                          },
                        },
                      ],
                    },
                  },
                },
              },
            ],
          },
          errors_state: {},
          last_execution_state: {
            max_timestamp: {
              value_as_string: '2020-06-18T00:00:10.000Z',
            },
          },
        },
      },
    ];

    const instanceCreatedDate = '2021-02-03T23:09:14.169Z';

    const instancesCreatedSummaries: Array<{
      savedObjectId: string;
      summary: Pick<RawEventLogAlertsSummary, 'instances'>;
    }> = [
      {
        savedObjectId: alert.id,
        summary: {
          instances: {
            buckets: [
              {
                key: 'instance-1',
                instance_created: {
                  max_timestamp: {
                    value_as_string: instanceCreatedDate,
                  },
                },
              },
            ],
          },
        },
      },
    ];
    const alertInstanceSummaries: AlertInstanceSummary[] = alertsInstanceSummaryFromEventLog({
      alerts: [alert],
      instancesLatestStateSummaries,
      instancesCreatedSummaries,
      dateStart,
      dateEnd,
    });

    const { lastRun, status, instances } = alertInstanceSummaries[0];
    expect({ lastRun, status, instances }).toMatchInlineSnapshot(`
      Object {
        "instances": Object {
          "instance-1": Object {
            "actionGroupId": undefined,
            "actionSubgroup": undefined,
            "activeStartDate": "${instanceCreatedDate}",
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
    const instancesLatestStateSummaries: Array<{
      savedObjectId: string;
      summary: RawEventLogAlertsSummary;
    }> = [
      {
        savedObjectId: alert.id,
        summary: {
          instances: {
            buckets: [
              {
                key: 'instance-1',
                last_state: {
                  action: {
                    hits: {
                      hits: [
                        {
                          _source: {
                            '@timestamp': '2021-02-04T23:20:20.343Z',
                            event: {
                              action: 'resolved-instance',
                            },
                          },
                        },
                      ],
                    },
                  },
                },
              },
            ],
          },
          errors_state: {},
          last_execution_state: {
            max_timestamp: {
              value_as_string: '2020-06-18T00:00:10.000Z',
            },
          },
        },
      },
    ];

    const instanceCreatedDate = '2021-02-03T23:09:14.169Z';

    const instancesCreatedSummaries: Array<{
      savedObjectId: string;
      summary: Pick<RawEventLogAlertsSummary, 'instances'>;
    }> = [
      {
        savedObjectId: alert.id,
        summary: {
          instances: {
            buckets: [
              {
                key: 'instance-1',
                instance_created: {
                  max_timestamp: {
                    value_as_string: instanceCreatedDate,
                  },
                },
              },
            ],
          },
        },
      },
    ];
    const alertInstanceSummaries: AlertInstanceSummary[] = alertsInstanceSummaryFromEventLog({
      alerts: [alert],
      instancesLatestStateSummaries,
      instancesCreatedSummaries,
      dateStart,
      dateEnd,
    });

    const { lastRun, status, instances } = alertInstanceSummaries[0];
    expect({ lastRun, status, instances }).toMatchInlineSnapshot(`
      Object {
        "instances": Object {
          "instance-1": Object {
            "actionGroupId": undefined,
            "actionSubgroup": undefined,
            "activeStartDate": "${instanceCreatedDate}",
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
    const instancesLatestStateSummaries: Array<{
      savedObjectId: string;
      summary: RawEventLogAlertsSummary;
    }> = [
      {
        savedObjectId: alert.id,
        summary: {
          instances: {
            buckets: [
              {
                key: 'instance-1',
                last_state: {
                  action: {
                    hits: {
                      hits: [
                        {
                          _source: {
                            '@timestamp': '2021-02-04T23:20:20.343Z',
                            event: {
                              action: 'recovered-instance',
                            },
                          },
                        },
                      ],
                    },
                  },
                },
              },
            ],
          },
          errors_state: {},
          last_execution_state: {
            max_timestamp: {
              value_as_string: '2020-06-18T00:00:10.000Z',
            },
          },
        },
      },
    ];
    const instancesCreatedSummaries: Array<{
      savedObjectId: string;
      summary: Pick<RawEventLogAlertsSummary, 'instances'>;
    }> = [
      {
        savedObjectId: alert.id,
        summary: {
          instances: {},
        },
      },
    ];
    const alertInstanceSummaries: AlertInstanceSummary[] = alertsInstanceSummaryFromEventLog({
      alerts: [alert],
      instancesLatestStateSummaries,
      instancesCreatedSummaries,
      dateStart,
      dateEnd,
    });

    const { lastRun, status, instances } = alertInstanceSummaries[0];
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
    const instancesLatestStateSummaries: Array<{
      savedObjectId: string;
      summary: RawEventLogAlertsSummary;
    }> = [
      {
        savedObjectId: alert.id,
        summary: {
          instances: {
            buckets: [
              {
                key: 'instance-1',
                last_state: {
                  action: {
                    hits: {
                      hits: [
                        {
                          _source: {
                            '@timestamp': '2021-02-04T23:20:20.343Z',
                            event: {
                              action: 'active-instance',
                            },
                            kibana: {
                              alerting: {
                                action_group_id: 'action group A',
                              },
                            },
                          },
                        },
                      ],
                    },
                  },
                },
              },
            ],
          },
          errors_state: {},
          last_execution_state: {
            max_timestamp: {
              value_as_string: '2020-06-18T00:00:10.000Z',
            },
          },
        },
      },
    ];

    const instanceCreatedDate = '2020-06-18T00:00:00.000Z';

    const instancesCreatedSummaries: Array<{
      savedObjectId: string;
      summary: Pick<RawEventLogAlertsSummary, 'instances'>;
    }> = [
      {
        savedObjectId: alert.id,
        summary: {
          instances: {
            buckets: [
              {
                key: 'instance-1',
                instance_created: {
                  max_timestamp: {
                    value_as_string: instanceCreatedDate,
                  },
                },
              },
            ],
          },
        },
      },
    ];
    const alertInstanceSummaries: AlertInstanceSummary[] = alertsInstanceSummaryFromEventLog({
      alerts: [alert],
      instancesLatestStateSummaries,
      instancesCreatedSummaries,
      dateStart,
      dateEnd,
    });

    const { lastRun, status, instances } = alertInstanceSummaries[0];
    expect({ lastRun, status, instances }).toMatchInlineSnapshot(`
      Object {
        "instances": Object {
          "instance-1": Object {
            "actionGroupId": "action group A",
            "actionSubgroup": undefined,
            "activeStartDate": "${instanceCreatedDate}",
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
    const instancesLatestStateSummaries: Array<{
      savedObjectId: string;
      summary: RawEventLogAlertsSummary;
    }> = [
      {
        savedObjectId: alert.id,
        summary: {
          instances: {
            buckets: [
              {
                key: 'instance-1',
                last_state: {
                  action: {
                    hits: {
                      hits: [
                        {
                          _source: {
                            '@timestamp': '2021-02-04T23:20:20.343Z',
                            event: {
                              action: 'active-instance',
                            },
                          },
                        },
                      ],
                    },
                  },
                },
              },
            ],
          },
          errors_state: {},
          last_execution_state: {
            max_timestamp: {
              value_as_string: '2020-06-18T00:00:10.000Z',
            },
          },
        },
      },
    ];

    const instanceCreatedDate = '2021-02-03T23:09:14.169Z';

    const instancesCreatedSummaries: Array<{
      savedObjectId: string;
      summary: Pick<RawEventLogAlertsSummary, 'instances'>;
    }> = [
      {
        savedObjectId: alert.id,
        summary: {
          instances: {
            buckets: [
              {
                key: 'instance-1',
                instance_created: {
                  max_timestamp: {
                    value_as_string: instanceCreatedDate,
                  },
                },
              },
            ],
          },
        },
      },
    ];
    const alertInstanceSummaries: AlertInstanceSummary[] = alertsInstanceSummaryFromEventLog({
      alerts: [alert],
      instancesLatestStateSummaries,
      instancesCreatedSummaries,
      dateStart,
      dateEnd,
    });

    const { lastRun, status, instances } = alertInstanceSummaries[0];
    expect({ lastRun, status, instances }).toMatchInlineSnapshot(`
      Object {
        "instances": Object {
          "instance-1": Object {
            "actionGroupId": undefined,
            "actionSubgroup": undefined,
            "activeStartDate": "${instanceCreatedDate}",
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
    const instancesLatestStateSummaries: Array<{
      savedObjectId: string;
      summary: RawEventLogAlertsSummary;
    }> = [
      {
        savedObjectId: alert.id,
        summary: {
          instances: {
            buckets: [
              {
                key: 'instance-1',
                last_state: {
                  action: {
                    hits: {
                      hits: [
                        {
                          _source: {
                            '@timestamp': '2021-02-04T23:20:20.343Z',
                            event: {
                              action: 'active-instance',
                            },
                            kibana: {
                              alerting: {
                                action_group_id: 'action group A',
                              },
                            },
                          },
                        },
                      ],
                    },
                  },
                },
              },
            ],
          },
          errors_state: {},
          last_execution_state: {
            max_timestamp: {
              value_as_string: '2020-06-18T00:00:10.000Z',
            },
          },
        },
      },
    ];

    const instancesCreatedSummaries: Array<{
      savedObjectId: string;
      summary: Pick<RawEventLogAlertsSummary, 'instances'>;
    }> = [
      {
        savedObjectId: alert.id,
        summary: {
          instances: {},
        },
      },
    ];
    const alertInstanceSummaries: AlertInstanceSummary[] = alertsInstanceSummaryFromEventLog({
      alerts: [alert],
      instancesLatestStateSummaries,
      instancesCreatedSummaries,
      dateStart,
      dateEnd,
    });

    const { lastRun, status, instances } = alertInstanceSummaries[0];
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
    const instancesLatestStateSummaries: Array<{
      savedObjectId: string;
      summary: RawEventLogAlertsSummary;
    }> = [
      {
        savedObjectId: alert.id,
        summary: {
          instances: {
            buckets: [
              {
                key: 'instance-1',
                last_state: {
                  action: {
                    hits: {
                      hits: [
                        {
                          _source: {
                            '@timestamp': '2021-02-04T23:20:20.343Z',
                            event: {
                              action: 'active-instance',
                            },
                            kibana: {
                              alerting: {
                                action_group_id: 'action group A',
                              },
                            },
                          },
                        },
                      ],
                    },
                  },
                },
              },
            ],
          },
          errors_state: {},
          last_execution_state: {
            max_timestamp: {
              value_as_string: '2020-06-18T00:00:10.000Z',
            },
          },
        },
      },
    ];

    const instanceCreatedDate = '2021-02-03T23:09:14.169Z';

    const instancesCreatedSummaries: Array<{
      savedObjectId: string;
      summary: Pick<RawEventLogAlertsSummary, 'instances'>;
    }> = [
      {
        savedObjectId: alert.id,
        summary: {
          instances: {
            buckets: [
              {
                key: 'instance-1',
                instance_created: {
                  max_timestamp: {
                    value_as_string: instanceCreatedDate,
                  },
                },
              },
            ],
          },
        },
      },
    ];
    const alertInstanceSummaries: AlertInstanceSummary[] = alertsInstanceSummaryFromEventLog({
      alerts: [alert],
      instancesLatestStateSummaries,
      instancesCreatedSummaries,
      dateStart,
      dateEnd,
    });

    const { lastRun, status, instances } = alertInstanceSummaries[0];
    expect({ lastRun, status, instances }).toMatchInlineSnapshot(`
      Object {
        "instances": Object {
          "instance-1": Object {
            "actionGroupId": "action group A",
            "actionSubgroup": undefined,
            "activeStartDate": "2021-02-03T23:09:14.169Z",
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
    const instancesLatestStateSummaries: Array<{
      savedObjectId: string;
      summary: RawEventLogAlertsSummary;
    }> = [
      {
        savedObjectId: alert.id,
        summary: {
          instances: {
            buckets: [
              {
                key: 'instance-1',
                last_state: {
                  action: {
                    hits: {
                      hits: [
                        {
                          _source: {
                            '@timestamp': '2021-02-04T23:20:20.343Z',
                            event: {
                              action: 'active-instance',
                            },
                            kibana: {
                              alerting: {
                                action_group_id: 'action group B',
                              },
                            },
                          },
                        },
                      ],
                    },
                  },
                },
              },
              {
                key: 'instance-2',
                last_state: {
                  action: {
                    hits: {
                      hits: [
                        {
                          _source: {
                            '@timestamp': '2021-02-04T23:20:20.343Z',
                            event: {
                              action: 'recovered-instance',
                            },
                          },
                        },
                      ],
                    },
                  },
                },
              },
            ],
          },
          errors_state: {},
          last_execution_state: {
            max_timestamp: {
              value_as_string: '2020-06-18T00:00:30.000Z',
            },
          },
        },
      },
    ];

    const instanceCreatedDate = '2021-02-03T23:09:14.169Z';

    const instancesCreatedSummaries: Array<{
      savedObjectId: string;
      summary: Pick<RawEventLogAlertsSummary, 'instances'>;
    }> = [
      {
        savedObjectId: alert.id,
        summary: {
          instances: {
            buckets: [
              {
                key: 'instance-1',
                instance_created: {
                  max_timestamp: {
                    value_as_string: instanceCreatedDate,
                  },
                },
              },
            ],
          },
        },
      },
    ];
    const alertInstanceSummaries: AlertInstanceSummary[] = alertsInstanceSummaryFromEventLog({
      alerts: [alert],
      instancesLatestStateSummaries,
      instancesCreatedSummaries,
      dateStart,
      dateEnd,
    });
    const { lastRun, status, instances } = alertInstanceSummaries[0];
    expect({ lastRun, status, instances }).toMatchInlineSnapshot(`
      Object {
        "instances": Object {
          "instance-1": Object {
            "actionGroupId": "action group B",
            "actionSubgroup": undefined,
            "activeStartDate": "${instanceCreatedDate}",
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
