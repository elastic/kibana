/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SanitizedAlert, AlertInstanceSummary } from '../types';
import { IValidatedEvent } from '../../../event_log/server';
import { EVENT_LOG_ACTIONS, EVENT_LOG_PROVIDER } from '../plugin';
import { alertInstanceSummaryFromEventLog } from './alert_instance_summary_from_event_log';

const ONE_HOUR_IN_MILLIS = 60 * 60 * 1000;
const dateStart = '2020-06-18T00:00:00.000Z';
const dateEnd = dateString(dateStart, ONE_HOUR_IN_MILLIS);

describe('alertInstanceSummaryFromEventLog', () => {
  test('no events and muted ids', async () => {
    const alert = createAlert({});
    const events: IValidatedEvent[] = [];
    const summary: AlertInstanceSummary = alertInstanceSummaryFromEventLog({
      alert,
      events,
      dateStart,
      dateEnd,
    });

    expect(summary).toMatchInlineSnapshot(`
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
    const events: IValidatedEvent[] = [];
    const summary: AlertInstanceSummary = alertInstanceSummaryFromEventLog({
      alert,
      events,
      dateStart: dateString(dateEnd, ONE_HOUR_IN_MILLIS),
      dateEnd: dateString(dateEnd, ONE_HOUR_IN_MILLIS * 2),
    });

    expect(summary).toMatchInlineSnapshot(`
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
    const events: IValidatedEvent[] = [];
    const summary: AlertInstanceSummary = alertInstanceSummaryFromEventLog({
      alert,
      events,
      dateStart,
      dateEnd,
    });

    const { lastRun, status, instances } = summary;
    expect({ lastRun, status, instances }).toMatchInlineSnapshot(`
      Object {
        "instances": Object {
          "instance-1": Object {
            "actionGroupId": undefined,
            "activeStartDate": undefined,
            "muted": true,
            "status": "OK",
          },
          "instance-2": Object {
            "actionGroupId": undefined,
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
    const eventsFactory = new EventsFactory();
    const events = eventsFactory.addExecute().advanceTime(10000).addExecute().getEvents();

    const summary: AlertInstanceSummary = alertInstanceSummaryFromEventLog({
      alert,
      events,
      dateStart,
      dateEnd,
    });

    const { lastRun, status, instances } = summary;
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
    const eventsFactory = new EventsFactory();
    const events = eventsFactory
      .addExecute('oof!')
      .advanceTime(10000)
      .addExecute('rut roh!')
      .getEvents();

    const summary: AlertInstanceSummary = alertInstanceSummaryFromEventLog({
      alert,
      events,
      dateStart,
      dateEnd,
    });

    const { lastRun, status, errorMessages, instances } = summary;
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
    const eventsFactory = new EventsFactory();
    const events = eventsFactory
      .addExecute()
      .addNewInstance('instance-1')
      .addActiveInstance('instance-1', 'action group A')
      .advanceTime(10000)
      .addExecute()
      .addResolvedInstance('instance-1')
      .getEvents();

    const summary: AlertInstanceSummary = alertInstanceSummaryFromEventLog({
      alert,
      events,
      dateStart,
      dateEnd,
    });

    const { lastRun, status, instances } = summary;
    expect({ lastRun, status, instances }).toMatchInlineSnapshot(`
      Object {
        "instances": Object {
          "instance-1": Object {
            "actionGroupId": undefined,
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
    const eventsFactory = new EventsFactory();
    const events = eventsFactory
      .addExecute()
      .addActiveInstance('instance-1', 'action group A')
      .advanceTime(10000)
      .addExecute()
      .addResolvedInstance('instance-1')
      .getEvents();

    const summary: AlertInstanceSummary = alertInstanceSummaryFromEventLog({
      alert,
      events,
      dateStart,
      dateEnd,
    });

    const { lastRun, status, instances } = summary;
    expect({ lastRun, status, instances }).toMatchInlineSnapshot(`
      Object {
        "instances": Object {
          "instance-1": Object {
            "actionGroupId": undefined,
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
    const eventsFactory = new EventsFactory();
    const events = eventsFactory
      .addExecute()
      .addNewInstance('instance-1')
      .addActiveInstance('instance-1', 'action group A')
      .advanceTime(10000)
      .addExecute()
      .addActiveInstance('instance-1', 'action group A')
      .getEvents();

    const summary: AlertInstanceSummary = alertInstanceSummaryFromEventLog({
      alert,
      events,
      dateStart,
      dateEnd,
    });

    const { lastRun, status, instances } = summary;
    expect({ lastRun, status, instances }).toMatchInlineSnapshot(`
      Object {
        "instances": Object {
          "instance-1": Object {
            "actionGroupId": "action group A",
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
    const eventsFactory = new EventsFactory();
    const events = eventsFactory
      .addExecute()
      .addNewInstance('instance-1')
      .addActiveInstance('instance-1', undefined)
      .advanceTime(10000)
      .addExecute()
      .addActiveInstance('instance-1', undefined)
      .getEvents();

    const summary: AlertInstanceSummary = alertInstanceSummaryFromEventLog({
      alert,
      events,
      dateStart,
      dateEnd,
    });

    const { lastRun, status, instances } = summary;
    expect({ lastRun, status, instances }).toMatchInlineSnapshot(`
      Object {
        "instances": Object {
          "instance-1": Object {
            "actionGroupId": undefined,
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
    const eventsFactory = new EventsFactory();
    const events = eventsFactory
      .addExecute()
      .addNewInstance('instance-1')
      .addActiveInstance('instance-1', 'action group A')
      .advanceTime(10000)
      .addExecute()
      .addActiveInstance('instance-1', 'action group B')
      .getEvents();

    const summary: AlertInstanceSummary = alertInstanceSummaryFromEventLog({
      alert,
      events,
      dateStart,
      dateEnd,
    });

    const { lastRun, status, instances } = summary;
    expect({ lastRun, status, instances }).toMatchInlineSnapshot(`
      Object {
        "instances": Object {
          "instance-1": Object {
            "actionGroupId": "action group B",
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
    const eventsFactory = new EventsFactory();
    const events = eventsFactory
      .addExecute()
      .addActiveInstance('instance-1', 'action group A')
      .advanceTime(10000)
      .addExecute()
      .addActiveInstance('instance-1', 'action group A')
      .getEvents();

    const summary: AlertInstanceSummary = alertInstanceSummaryFromEventLog({
      alert,
      events,
      dateStart,
      dateEnd,
    });

    const { lastRun, status, instances } = summary;
    expect({ lastRun, status, instances }).toMatchInlineSnapshot(`
      Object {
        "instances": Object {
          "instance-1": Object {
            "actionGroupId": "action group A",
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
    const eventsFactory = new EventsFactory();
    const events = eventsFactory
      .addExecute()
      .addNewInstance('instance-1')
      .addActiveInstance('instance-1', 'action group A')
      .addNewInstance('instance-2')
      .addActiveInstance('instance-2', 'action group B')
      .advanceTime(10000)
      .addExecute()
      .addActiveInstance('instance-1', 'action group A')
      .addResolvedInstance('instance-2')
      .getEvents();

    const summary: AlertInstanceSummary = alertInstanceSummaryFromEventLog({
      alert,
      events,
      dateStart,
      dateEnd,
    });

    const { lastRun, status, instances } = summary;
    expect({ lastRun, status, instances }).toMatchInlineSnapshot(`
      Object {
        "instances": Object {
          "instance-1": Object {
            "actionGroupId": "action group A",
            "activeStartDate": "2020-06-18T00:00:00.000Z",
            "muted": true,
            "status": "Active",
          },
          "instance-2": Object {
            "actionGroupId": undefined,
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
    const eventsFactory = new EventsFactory();
    const events = eventsFactory
      .addExecute()
      .addNewInstance('instance-1')
      .addActiveInstance('instance-1', 'action group A')
      .addNewInstance('instance-2')
      .addActiveInstance('instance-2', 'action group B')
      .advanceTime(10000)
      .addExecute()
      .addActiveInstance('instance-1', 'action group A')
      .addResolvedInstance('instance-2')
      .advanceTime(10000)
      .addExecute()
      .addActiveInstance('instance-1', 'action group B')
      .advanceTime(10000)
      .addExecute()
      .addActiveInstance('instance-1', 'action group B')
      .getEvents();

    const summary: AlertInstanceSummary = alertInstanceSummaryFromEventLog({
      alert,
      events,
      dateStart,
      dateEnd,
    });

    const { lastRun, status, instances } = summary;
    expect({ lastRun, status, instances }).toMatchInlineSnapshot(`
      Object {
        "instances": Object {
          "instance-1": Object {
            "actionGroupId": "action group B",
            "activeStartDate": "2020-06-18T00:00:00.000Z",
            "muted": false,
            "status": "Active",
          },
          "instance-2": Object {
            "actionGroupId": undefined,
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

export class EventsFactory {
  private events: IValidatedEvent[] = [];

  constructor(private date: string = dateStart) {}

  getEvents(): IValidatedEvent[] {
    // ES normally returns events sorted newest to oldest, so we need to sort
    // that way also
    const events = this.events.slice();
    events.sort((a, b) => -a!['@timestamp']!.localeCompare(b!['@timestamp']!));
    return events;
  }

  getTime(): string {
    return this.date;
  }

  advanceTime(millis: number): EventsFactory {
    this.date = dateString(this.date, millis);
    return this;
  }

  addExecute(errorMessage?: string): EventsFactory {
    let event: IValidatedEvent = {
      '@timestamp': this.date,
      event: {
        provider: EVENT_LOG_PROVIDER,
        action: EVENT_LOG_ACTIONS.execute,
      },
    };

    if (errorMessage) {
      event = { ...event, error: { message: errorMessage } };
    }

    this.events.push(event);
    return this;
  }

  addActiveInstance(instanceId: string, actionGroupId: string | undefined): EventsFactory {
    const kibanaAlerting = actionGroupId
      ? { instance_id: instanceId, action_group_id: actionGroupId }
      : { instance_id: instanceId };
    this.events.push({
      '@timestamp': this.date,
      event: {
        provider: EVENT_LOG_PROVIDER,
        action: EVENT_LOG_ACTIONS.activeInstance,
      },
      kibana: { alerting: kibanaAlerting },
    });
    return this;
  }

  addNewInstance(instanceId: string): EventsFactory {
    this.events.push({
      '@timestamp': this.date,
      event: {
        provider: EVENT_LOG_PROVIDER,
        action: EVENT_LOG_ACTIONS.newInstance,
      },
      kibana: { alerting: { instance_id: instanceId } },
    });
    return this;
  }

  addResolvedInstance(instanceId: string): EventsFactory {
    this.events.push({
      '@timestamp': this.date,
      event: {
        provider: EVENT_LOG_PROVIDER,
        action: EVENT_LOG_ACTIONS.resolvedInstance,
      },
      kibana: { alerting: { instance_id: instanceId } },
    });
    return this;
  }
}

function createAlert(overrides: Partial<SanitizedAlert>): SanitizedAlert {
  return { ...BaseAlert, ...overrides };
}

const BaseAlert: SanitizedAlert = {
  id: 'alert-123',
  alertTypeId: '123',
  schedule: { interval: '10s' },
  enabled: false,
  name: 'alert-name',
  tags: [],
  consumer: 'alert-consumer',
  throttle: null,
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
