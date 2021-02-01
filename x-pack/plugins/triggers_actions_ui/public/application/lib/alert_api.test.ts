/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Alert, AlertType, AlertUpdates } from '../../types';
import { httpServiceMock } from '../../../../../../src/core/public/mocks';
import {
  createAlert,
  deleteAlerts,
  disableAlerts,
  enableAlerts,
  disableAlert,
  enableAlert,
  loadAlert,
  loadAlertAggregations,
  loadAlerts,
  loadAlertState,
  loadAlertTypes,
  muteAlerts,
  unmuteAlerts,
  muteAlert,
  unmuteAlert,
  updateAlert,
  muteAlertInstance,
  unmuteAlertInstance,
  alertingFrameworkHealth,
  mapFiltersToKql,
} from './alert_api';
import uuid from 'uuid';
import { AlertNotifyWhenType, ALERTS_FEATURE_ID } from '../../../../alerts/common';

const http = httpServiceMock.createStartContract();

beforeEach(() => jest.resetAllMocks());

describe('loadAlertTypes', () => {
  test('should call get alert types API', async () => {
    const resolvedValue: AlertType[] = [
      {
        id: 'test',
        name: 'Test',
        actionVariables: {
          context: [{ name: 'var1', description: 'val1' }],
          state: [{ name: 'var2', description: 'val2' }],
          params: [{ name: 'var3', description: 'val3' }],
        },
        producer: ALERTS_FEATURE_ID,
        actionGroups: [{ id: 'default', name: 'Default' }],
        recoveryActionGroup: { id: 'recovered', name: 'Recovered' },
        defaultActionGroupId: 'default',
        authorizedConsumers: {},
        minimumLicenseRequired: 'basic',
        enabledInLicense: true,
      },
    ];
    http.get.mockResolvedValueOnce(resolvedValue);

    const result = await loadAlertTypes({ http });
    expect(result).toEqual(resolvedValue);
    expect(http.get.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "/api/alerts/list_alert_types",
      ]
    `);
  });
});

describe('loadAlert', () => {
  test('should call get API with base parameters', async () => {
    const alertId = uuid.v4();
    const resolvedValue = {
      id: alertId,
      name: 'name',
      tags: [],
      enabled: true,
      alertTypeId: '.noop',
      schedule: { interval: '1s' },
      actions: [],
      params: {},
      createdBy: null,
      updatedBy: null,
      throttle: null,
      muteAll: false,
      mutedInstanceIds: [],
    };
    http.get.mockResolvedValueOnce(resolvedValue);

    expect(await loadAlert({ http, alertId })).toEqual(resolvedValue);
    expect(http.get).toHaveBeenCalledWith(`/api/alerts/alert/${alertId}`);
  });
});

describe('loadAlertState', () => {
  test('should call get API with base parameters', async () => {
    const alertId = uuid.v4();
    const resolvedValue = {
      alertTypeState: {
        some: 'value',
      },
      alertInstances: {
        first_instance: {},
        second_instance: {},
      },
    };
    http.get.mockResolvedValueOnce(resolvedValue);

    expect(await loadAlertState({ http, alertId })).toEqual(resolvedValue);
    expect(http.get).toHaveBeenCalledWith(`/api/alerts/alert/${alertId}/state`);
  });

  test('should parse AlertInstances', async () => {
    const alertId = uuid.v4();
    const resolvedValue = {
      alertTypeState: {
        some: 'value',
      },
      alertInstances: {
        first_instance: {
          state: {},
          meta: {
            lastScheduledActions: {
              group: 'first_group',
              date: '2020-02-09T23:15:41.941Z',
            },
          },
        },
      },
    };
    http.get.mockResolvedValueOnce(resolvedValue);

    expect(await loadAlertState({ http, alertId })).toEqual({
      ...resolvedValue,
      alertInstances: {
        first_instance: {
          state: {},
          meta: {
            lastScheduledActions: {
              group: 'first_group',
              date: new Date('2020-02-09T23:15:41.941Z'),
            },
          },
        },
      },
    });
    expect(http.get).toHaveBeenCalledWith(`/api/alerts/alert/${alertId}/state`);
  });

  test('should handle empty response from api', async () => {
    const alertId = uuid.v4();
    http.get.mockResolvedValueOnce('');

    expect(await loadAlertState({ http, alertId })).toEqual({});
    expect(http.get).toHaveBeenCalledWith(`/api/alerts/alert/${alertId}/state`);
  });
});

describe('loadAlerts', () => {
  test('should call find API with base parameters', async () => {
    const resolvedValue = {
      page: 1,
      perPage: 10,
      total: 0,
      data: [],
    };
    http.get.mockResolvedValueOnce(resolvedValue);

    const result = await loadAlerts({ http, page: { index: 0, size: 10 } });
    expect(result).toEqual(resolvedValue);
    expect(http.get.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "/api/alerts/_find",
        Object {
          "query": Object {
            "default_search_operator": "AND",
            "filter": undefined,
            "page": 1,
            "per_page": 10,
            "search": undefined,
            "search_fields": undefined,
            "sort_field": "name.keyword",
            "sort_order": "asc",
          },
        },
      ]
    `);
  });

  test('should call find API with searchText', async () => {
    const resolvedValue = {
      page: 1,
      perPage: 10,
      total: 0,
      data: [],
    };
    http.get.mockResolvedValueOnce(resolvedValue);

    const result = await loadAlerts({ http, searchText: 'apples', page: { index: 0, size: 10 } });
    expect(result).toEqual(resolvedValue);
    expect(http.get.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "/api/alerts/_find",
        Object {
          "query": Object {
            "default_search_operator": "AND",
            "filter": undefined,
            "page": 1,
            "per_page": 10,
            "search": "apples",
            "search_fields": "[\\"name\\",\\"tags\\"]",
            "sort_field": "name.keyword",
            "sort_order": "asc",
          },
        },
      ]
    `);
  });

  test('should call find API with actionTypesFilter', async () => {
    const resolvedValue = {
      page: 1,
      perPage: 10,
      total: 0,
      data: [],
    };
    http.get.mockResolvedValueOnce(resolvedValue);

    const result = await loadAlerts({
      http,
      searchText: 'foo',
      page: { index: 0, size: 10 },
    });
    expect(result).toEqual(resolvedValue);
    expect(http.get.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "/api/alerts/_find",
        Object {
          "query": Object {
            "default_search_operator": "AND",
            "filter": undefined,
            "page": 1,
            "per_page": 10,
            "search": "foo",
            "search_fields": "[\\"name\\",\\"tags\\"]",
            "sort_field": "name.keyword",
            "sort_order": "asc",
          },
        },
      ]
    `);
  });

  test('should call find API with typesFilter', async () => {
    const resolvedValue = {
      page: 1,
      perPage: 10,
      total: 0,
      data: [],
    };
    http.get.mockResolvedValueOnce(resolvedValue);

    const result = await loadAlerts({
      http,
      typesFilter: ['foo', 'bar'],
      page: { index: 0, size: 10 },
    });
    expect(result).toEqual(resolvedValue);
    expect(http.get.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "/api/alerts/_find",
        Object {
          "query": Object {
            "default_search_operator": "AND",
            "filter": "alert.attributes.alertTypeId:(foo or bar)",
            "page": 1,
            "per_page": 10,
            "search": undefined,
            "search_fields": undefined,
            "sort_field": "name.keyword",
            "sort_order": "asc",
          },
        },
      ]
    `);
  });

  test('should call find API with actionTypesFilter and typesFilter', async () => {
    const resolvedValue = {
      page: 1,
      perPage: 10,
      total: 0,
      data: [],
    };
    http.get.mockResolvedValueOnce(resolvedValue);

    const result = await loadAlerts({
      http,
      searchText: 'baz',
      typesFilter: ['foo', 'bar'],
      page: { index: 0, size: 10 },
    });
    expect(result).toEqual(resolvedValue);
    expect(http.get.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "/api/alerts/_find",
        Object {
          "query": Object {
            "default_search_operator": "AND",
            "filter": "alert.attributes.alertTypeId:(foo or bar)",
            "page": 1,
            "per_page": 10,
            "search": "baz",
            "search_fields": "[\\"name\\",\\"tags\\"]",
            "sort_field": "name.keyword",
            "sort_order": "asc",
          },
        },
      ]
    `);
  });

  test('should call find API with searchText and tagsFilter and typesFilter', async () => {
    const resolvedValue = {
      page: 1,
      perPage: 10,
      total: 0,
      data: [],
    };
    http.get.mockResolvedValueOnce(resolvedValue);

    const result = await loadAlerts({
      http,
      searchText: 'apples, foo, baz',
      typesFilter: ['foo', 'bar'],
      page: { index: 0, size: 10 },
    });
    expect(result).toEqual(resolvedValue);
    expect(http.get.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "/api/alerts/_find",
        Object {
          "query": Object {
            "default_search_operator": "AND",
            "filter": "alert.attributes.alertTypeId:(foo or bar)",
            "page": 1,
            "per_page": 10,
            "search": "apples, foo, baz",
            "search_fields": "[\\"name\\",\\"tags\\"]",
            "sort_field": "name.keyword",
            "sort_order": "asc",
          },
        },
      ]
    `);
  });
});

describe('loadAlertAggregations', () => {
  test('should call aggregate API with base parameters', async () => {
    const resolvedValue = {
      alertExecutionStatus: {
        ok: 4,
        active: 2,
        error: 1,
        pending: 1,
        unknown: 0,
      },
    };
    http.get.mockResolvedValueOnce(resolvedValue);

    const result = await loadAlertAggregations({ http });
    expect(result).toEqual(resolvedValue);
    expect(http.get.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "/api/alerts/_aggregate",
        Object {
          "query": Object {
            "default_search_operator": "AND",
            "filter": undefined,
            "search": undefined,
            "search_fields": undefined,
          },
        },
      ]
    `);
  });

  test('should call aggregate API with searchText', async () => {
    const resolvedValue = {
      alertExecutionStatus: {
        ok: 4,
        active: 2,
        error: 1,
        pending: 1,
        unknown: 0,
      },
    };
    http.get.mockResolvedValueOnce(resolvedValue);

    const result = await loadAlertAggregations({ http, searchText: 'apples' });
    expect(result).toEqual(resolvedValue);
    expect(http.get.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "/api/alerts/_aggregate",
        Object {
          "query": Object {
            "default_search_operator": "AND",
            "filter": undefined,
            "search": "apples",
            "search_fields": "[\\"name\\",\\"tags\\"]",
          },
        },
      ]
    `);
  });

  test('should call aggregate API with actionTypesFilter', async () => {
    const resolvedValue = {
      alertExecutionStatus: {
        ok: 4,
        active: 2,
        error: 1,
        pending: 1,
        unknown: 0,
      },
    };
    http.get.mockResolvedValueOnce(resolvedValue);

    const result = await loadAlertAggregations({
      http,
      searchText: 'foo',
      actionTypesFilter: ['action', 'type'],
    });
    expect(result).toEqual(resolvedValue);
    expect(http.get.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "/api/alerts/_aggregate",
        Object {
          "query": Object {
            "default_search_operator": "AND",
            "filter": "(alert.attributes.actions:{ actionTypeId:action } OR alert.attributes.actions:{ actionTypeId:type })",
            "search": "foo",
            "search_fields": "[\\"name\\",\\"tags\\"]",
          },
        },
      ]
    `);
  });

  test('should call aggregate API with typesFilter', async () => {
    const resolvedValue = {
      alertExecutionStatus: {
        ok: 4,
        active: 2,
        error: 1,
        pending: 1,
        unknown: 0,
      },
    };
    http.get.mockResolvedValueOnce(resolvedValue);

    const result = await loadAlertAggregations({
      http,
      typesFilter: ['foo', 'bar'],
    });
    expect(result).toEqual(resolvedValue);
    expect(http.get.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "/api/alerts/_aggregate",
        Object {
          "query": Object {
            "default_search_operator": "AND",
            "filter": "alert.attributes.alertTypeId:(foo or bar)",
            "search": undefined,
            "search_fields": undefined,
          },
        },
      ]
    `);
  });

  test('should call aggregate API with actionTypesFilter and typesFilter', async () => {
    const resolvedValue = {
      alertExecutionStatus: {
        ok: 4,
        active: 2,
        error: 1,
        pending: 1,
        unknown: 0,
      },
    };
    http.get.mockResolvedValueOnce(resolvedValue);

    const result = await loadAlertAggregations({
      http,
      searchText: 'baz',
      actionTypesFilter: ['action', 'type'],
      typesFilter: ['foo', 'bar'],
    });
    expect(result).toEqual(resolvedValue);
    expect(http.get.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "/api/alerts/_aggregate",
        Object {
          "query": Object {
            "default_search_operator": "AND",
            "filter": "alert.attributes.alertTypeId:(foo or bar) and (alert.attributes.actions:{ actionTypeId:action } OR alert.attributes.actions:{ actionTypeId:type })",
            "search": "baz",
            "search_fields": "[\\"name\\",\\"tags\\"]",
          },
        },
      ]
    `);
  });
});

describe('deleteAlerts', () => {
  test('should call delete API for each alert', async () => {
    const ids = ['1', '2', '3'];
    const result = await deleteAlerts({ http, ids });
    expect(result).toEqual({ errors: [], successes: [undefined, undefined, undefined] });
    expect(http.delete.mock.calls).toMatchInlineSnapshot(`
      Array [
        Array [
          "/api/alerts/alert/1",
        ],
        Array [
          "/api/alerts/alert/2",
        ],
        Array [
          "/api/alerts/alert/3",
        ],
      ]
    `);
  });
});

describe('createAlert', () => {
  test('should call create alert API', async () => {
    const alertToCreate: AlertUpdates = {
      name: 'test',
      consumer: 'alerts',
      tags: ['foo'],
      enabled: true,
      alertTypeId: 'test',
      schedule: {
        interval: '1m',
      },
      actions: [],
      params: {},
      throttle: null,
      notifyWhen: 'onActionGroupChange' as AlertNotifyWhenType,
      createdAt: new Date('1970-01-01T00:00:00.000Z'),
      updatedAt: new Date('1970-01-01T00:00:00.000Z'),
      apiKeyOwner: null,
      createdBy: null,
      updatedBy: null,
      muteAll: false,
      mutedInstanceIds: [],
    };
    const resolvedValue = {
      ...alertToCreate,
      id: '123',
      createdBy: null,
      updatedBy: null,
      muteAll: false,
      mutedInstanceIds: [],
      executionStatus: {
        status: 'unknown',
        lastExecutionDate: new Date('2020-08-20T19:23:38Z'),
      },
    };
    http.post.mockResolvedValueOnce(resolvedValue);

    const result = await createAlert({ http, alert: alertToCreate });
    expect(result).toEqual(resolvedValue);
    expect(http.post.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "/api/alerts/alert",
        Object {
          "body": "{\\"name\\":\\"test\\",\\"consumer\\":\\"alerts\\",\\"tags\\":[\\"foo\\"],\\"enabled\\":true,\\"alertTypeId\\":\\"test\\",\\"schedule\\":{\\"interval\\":\\"1m\\"},\\"actions\\":[],\\"params\\":{},\\"throttle\\":null,\\"notifyWhen\\":\\"onActionGroupChange\\",\\"createdAt\\":\\"1970-01-01T00:00:00.000Z\\",\\"updatedAt\\":\\"1970-01-01T00:00:00.000Z\\",\\"apiKeyOwner\\":null,\\"createdBy\\":null,\\"updatedBy\\":null,\\"muteAll\\":false,\\"mutedInstanceIds\\":[]}",
        },
      ]
    `);
  });
});

describe('updateAlert', () => {
  test('should call alert update API', async () => {
    const alertToUpdate = {
      throttle: '1m',
      consumer: 'alerts',
      name: 'test',
      tags: ['foo'],
      schedule: {
        interval: '1m',
      },
      params: {},
      actions: [],
      createdAt: new Date('1970-01-01T00:00:00.000Z'),
      updatedAt: new Date('1970-01-01T00:00:00.000Z'),
      apiKey: null,
      apiKeyOwner: null,
      notifyWhen: 'onThrottleInterval' as AlertNotifyWhenType,
    };
    const resolvedValue: Alert = {
      ...alertToUpdate,
      id: '123',
      enabled: true,
      alertTypeId: 'test',
      createdBy: null,
      updatedBy: null,
      muteAll: false,
      mutedInstanceIds: [],
      executionStatus: {
        status: 'unknown',
        lastExecutionDate: new Date('2020-08-20T19:23:38Z'),
      },
    };
    http.put.mockResolvedValueOnce(resolvedValue);

    const result = await updateAlert({ http, id: '123', alert: alertToUpdate });
    expect(result).toEqual(resolvedValue);
    expect(http.put.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "/api/alerts/alert/123",
        Object {
          "body": "{\\"throttle\\":\\"1m\\",\\"name\\":\\"test\\",\\"tags\\":[\\"foo\\"],\\"schedule\\":{\\"interval\\":\\"1m\\"},\\"params\\":{},\\"actions\\":[],\\"notifyWhen\\":\\"onThrottleInterval\\"}",
        },
      ]
    `);
  });
});

describe('enableAlert', () => {
  test('should call enable alert API', async () => {
    const result = await enableAlert({ http, id: '1' });
    expect(result).toEqual(undefined);
    expect(http.post.mock.calls).toMatchInlineSnapshot(`
      Array [
        Array [
          "/api/alerts/alert/1/_enable",
        ],
      ]
    `);
  });
});

describe('disableAlert', () => {
  test('should call disable alert API', async () => {
    const result = await disableAlert({ http, id: '1' });
    expect(result).toEqual(undefined);
    expect(http.post.mock.calls).toMatchInlineSnapshot(`
      Array [
        Array [
          "/api/alerts/alert/1/_disable",
        ],
      ]
    `);
  });
});

describe('muteAlertInstance', () => {
  test('should call mute instance alert API', async () => {
    const result = await muteAlertInstance({ http, id: '1', instanceId: '123' });
    expect(result).toEqual(undefined);
    expect(http.post.mock.calls).toMatchInlineSnapshot(`
      Array [
        Array [
          "/api/alerts/alert/1/alert_instance/123/_mute",
        ],
      ]
    `);
  });
});

describe('unmuteAlertInstance', () => {
  test('should call mute instance alert API', async () => {
    const result = await unmuteAlertInstance({ http, id: '1', instanceId: '123' });
    expect(result).toEqual(undefined);
    expect(http.post.mock.calls).toMatchInlineSnapshot(`
      Array [
        Array [
          "/api/alerts/alert/1/alert_instance/123/_unmute",
        ],
      ]
    `);
  });
});

describe('muteAlert', () => {
  test('should call mute alert API', async () => {
    const result = await muteAlert({ http, id: '1' });
    expect(result).toEqual(undefined);
    expect(http.post.mock.calls).toMatchInlineSnapshot(`
      Array [
        Array [
          "/api/alerts/alert/1/_mute_all",
        ],
      ]
    `);
  });
});

describe('unmuteAlert', () => {
  test('should call unmute alert API', async () => {
    const result = await unmuteAlert({ http, id: '1' });
    expect(result).toEqual(undefined);
    expect(http.post.mock.calls).toMatchInlineSnapshot(`
      Array [
        Array [
          "/api/alerts/alert/1/_unmute_all",
        ],
      ]
    `);
  });
});

describe('enableAlerts', () => {
  test('should call enable alert API per alert', async () => {
    const ids = ['1', '2', '3'];
    const result = await enableAlerts({ http, ids });
    expect(result).toEqual(undefined);
    expect(http.post.mock.calls).toMatchInlineSnapshot(`
      Array [
        Array [
          "/api/alerts/alert/1/_enable",
        ],
        Array [
          "/api/alerts/alert/2/_enable",
        ],
        Array [
          "/api/alerts/alert/3/_enable",
        ],
      ]
    `);
  });
});

describe('disableAlerts', () => {
  test('should call disable alert API per alert', async () => {
    const ids = ['1', '2', '3'];
    const result = await disableAlerts({ http, ids });
    expect(result).toEqual(undefined);
    expect(http.post.mock.calls).toMatchInlineSnapshot(`
      Array [
        Array [
          "/api/alerts/alert/1/_disable",
        ],
        Array [
          "/api/alerts/alert/2/_disable",
        ],
        Array [
          "/api/alerts/alert/3/_disable",
        ],
      ]
    `);
  });
});

describe('muteAlerts', () => {
  test('should call mute alert API per alert', async () => {
    const ids = ['1', '2', '3'];
    const result = await muteAlerts({ http, ids });
    expect(result).toEqual(undefined);
    expect(http.post.mock.calls).toMatchInlineSnapshot(`
      Array [
        Array [
          "/api/alerts/alert/1/_mute_all",
        ],
        Array [
          "/api/alerts/alert/2/_mute_all",
        ],
        Array [
          "/api/alerts/alert/3/_mute_all",
        ],
      ]
    `);
  });
});

describe('unmuteAlerts', () => {
  test('should call unmute alert API per alert', async () => {
    const ids = ['1', '2', '3'];
    const result = await unmuteAlerts({ http, ids });
    expect(result).toEqual(undefined);
    expect(http.post.mock.calls).toMatchInlineSnapshot(`
      Array [
        Array [
          "/api/alerts/alert/1/_unmute_all",
        ],
        Array [
          "/api/alerts/alert/2/_unmute_all",
        ],
        Array [
          "/api/alerts/alert/3/_unmute_all",
        ],
      ]
    `);
  });
});

describe('alertingFrameworkHealth', () => {
  test('should call alertingFrameworkHealth API', async () => {
    const result = await alertingFrameworkHealth({ http });
    expect(result).toEqual(undefined);
    expect(http.get.mock.calls).toMatchInlineSnapshot(`
      Array [
        Array [
          "/api/alerts/_health",
        ],
      ]
    `);
  });
});

describe('mapFiltersToKql', () => {
  test('should handle no filters', () => {
    expect(mapFiltersToKql({})).toEqual([]);
  });

  test('should handle typesFilter', () => {
    expect(
      mapFiltersToKql({
        typesFilter: ['type', 'filter'],
      })
    ).toEqual(['alert.attributes.alertTypeId:(type or filter)']);
  });

  test('should handle actionTypesFilter', () => {
    expect(
      mapFiltersToKql({
        actionTypesFilter: ['action', 'types', 'filter'],
      })
    ).toEqual([
      '(alert.attributes.actions:{ actionTypeId:action } OR alert.attributes.actions:{ actionTypeId:types } OR alert.attributes.actions:{ actionTypeId:filter })',
    ]);
  });

  test('should handle alertStatusesFilter', () => {
    expect(
      mapFiltersToKql({
        alertStatusesFilter: ['alert', 'statuses', 'filter'],
      })
    ).toEqual(['alert.attributes.executionStatus.status:(alert or statuses or filter)']);
  });

  test('should handle typesFilter and actionTypesFilter', () => {
    expect(
      mapFiltersToKql({
        typesFilter: ['type', 'filter'],
        actionTypesFilter: ['action', 'types', 'filter'],
      })
    ).toEqual([
      'alert.attributes.alertTypeId:(type or filter)',
      '(alert.attributes.actions:{ actionTypeId:action } OR alert.attributes.actions:{ actionTypeId:types } OR alert.attributes.actions:{ actionTypeId:filter })',
    ]);
  });

  test('should handle typesFilter, actionTypesFilter and alertStatusesFilter', () => {
    expect(
      mapFiltersToKql({
        typesFilter: ['type', 'filter'],
        actionTypesFilter: ['action', 'types', 'filter'],
        alertStatusesFilter: ['alert', 'statuses', 'filter'],
      })
    ).toEqual([
      'alert.attributes.alertTypeId:(type or filter)',
      '(alert.attributes.actions:{ actionTypeId:action } OR alert.attributes.actions:{ actionTypeId:types } OR alert.attributes.actions:{ actionTypeId:filter })',
      'alert.attributes.executionStatus.status:(alert or statuses or filter)',
    ]);
  });
});
