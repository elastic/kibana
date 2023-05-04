/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';

jest.mock('./post_pagerduty', () => ({
  postPagerduty: jest.fn(),
}));
import { Services } from '@kbn/actions-plugin/server/types';
import { validateConfig, validateSecrets, validateParams } from '@kbn/actions-plugin/server/lib';
import { postPagerduty } from './post_pagerduty';
import { Logger } from '@kbn/core/server';
import { actionsConfigMock } from '@kbn/actions-plugin/server/actions_config.mock';
import { actionsMock } from '@kbn/actions-plugin/server/mocks';
import {
  ActionParamsType,
  getConnectorType,
  PagerDutyConnectorType,
  PagerDutyConnectorTypeExecutorOptions,
} from '.';
import { ActionsConfigurationUtilities } from '@kbn/actions-plugin/server/actions_config';
import { loggerMock } from '@kbn/logging-mocks';

const postPagerdutyMock = postPagerduty as jest.Mock;
const services: Services = actionsMock.createServices();
const mockedLogger: jest.Mocked<Logger> = loggerMock.create();

let connectorType: PagerDutyConnectorType;
let configurationUtilities: jest.Mocked<ActionsConfigurationUtilities>;

beforeEach(() => {
  configurationUtilities = actionsConfigMock.create();
  connectorType = getConnectorType();
});

describe('get()', () => {
  test('should return correct connector type', () => {
    expect(connectorType.id).toEqual('.pagerduty');
    expect(connectorType.name).toEqual('PagerDuty');
  });
});

describe('validateConfig()', () => {
  test('should validate and pass when config is valid', () => {
    expect(validateConfig(connectorType, {}, { configurationUtilities })).toEqual({ apiUrl: null });
    expect(
      validateConfig(
        connectorType,
        {
          apiUrl: 'bar',
        },
        { configurationUtilities }
      )
    ).toEqual({ apiUrl: 'bar' });
  });

  test('should validate and throw error when config is invalid', () => {
    expect(() => {
      validateConfig(connectorType, { shouldNotBeHere: true }, { configurationUtilities });
    }).toThrowErrorMatchingInlineSnapshot(
      `"error validating action type config: [shouldNotBeHere]: definition for this key is missing"`
    );
  });

  test('should validate and pass when the pagerduty url is added to allowedHosts', () => {
    const configUtils = {
      ...actionsConfigMock.create(),
      ensureUriAllowed: (url: string) => {
        expect(url).toEqual('https://events.pagerduty.com/v2/enqueue');
      },
    };
    connectorType = getConnectorType();

    expect(
      validateConfig(
        connectorType,
        { apiUrl: 'https://events.pagerduty.com/v2/enqueue' },
        { configurationUtilities: configUtils }
      )
    ).toEqual({ apiUrl: 'https://events.pagerduty.com/v2/enqueue' });
  });

  test('config validation returns an error if the specified URL isnt added to allowedHosts', () => {
    const configUtils = {
      ...actionsConfigMock.create(),
      ensureUriAllowed: (_: string) => {
        throw new Error(`target url is not added to allowedHosts`);
      },
    };
    connectorType = getConnectorType();

    expect(() => {
      validateConfig(
        connectorType,
        { apiUrl: 'https://events.pagerduty.com/v2/enqueue' },
        { configurationUtilities: configUtils }
      );
    }).toThrowErrorMatchingInlineSnapshot(
      `"error validating action type config: error configuring pagerduty action: target url is not added to allowedHosts"`
    );
  });
});

describe('validateSecrets()', () => {
  test('should validate and pass when secrets is valid', () => {
    const routingKey = 'super-secret';
    expect(validateSecrets(connectorType, { routingKey }, { configurationUtilities })).toEqual({
      routingKey,
    });
  });

  test('should validate and throw error when secrets is invalid', () => {
    expect(() => {
      validateSecrets(connectorType, { routingKey: false }, { configurationUtilities });
    }).toThrowErrorMatchingInlineSnapshot(
      `"error validating action type secrets: [routingKey]: expected value of type [string] but got [boolean]"`
    );

    expect(() => {
      validateSecrets(connectorType, {}, { configurationUtilities });
    }).toThrowErrorMatchingInlineSnapshot(
      `"error validating action type secrets: [routingKey]: expected value of type [string] but got [undefined]"`
    );
  });
});

describe('validateParams()', () => {
  test('should validate and pass when params is valid', () => {
    expect(validateParams(connectorType, {}, { configurationUtilities })).toEqual({});

    const params = {
      eventAction: 'trigger',
      dedupKey: 'a dedupKey',
      summary: 'a summary',
      source: 'a source',
      severity: 'critical',
      timestamp: new Date().toISOString(),
      component: 'a component',
      group: 'a group',
      class: 'a class',
    };
    expect(validateParams(connectorType, params, { configurationUtilities })).toEqual(params);
  });

  test('should validate and throw error when params is invalid', () => {
    expect(() => {
      validateParams(connectorType, { eventAction: 'ackynollage' }, { configurationUtilities });
    }).toThrowErrorMatchingInlineSnapshot(`
"error validating action params: [eventAction]: types that failed validation:
- [eventAction.0]: expected value to equal [trigger]
- [eventAction.1]: expected value to equal [resolve]
- [eventAction.2]: expected value to equal [acknowledge]"
`);
  });

  test('should validate and pass when valid timestamp has spaces', () => {
    const randoDate = new Date('1963-09-23T01:23:45Z').toISOString();
    const timestamp = `  ${randoDate}`;
    expect(
      validateParams(
        connectorType,
        {
          timestamp,
        },
        { configurationUtilities }
      )
    ).toEqual({ timestamp });
  });

  test('should validate and pass when timestamp is empty string', () => {
    const timestamp = '';
    expect(
      validateParams(
        connectorType,
        {
          timestamp,
        },
        { configurationUtilities }
      )
    ).toEqual({ timestamp });
  });

  test('should validate and pass all the valid ISO-8601 formatted dates', () => {
    const date1 = '2011-05-06T17:00Z';
    const date2 = '2011-05-06T03:30-07';
    const date3 = '2011-05-06';

    expect(
      validateParams(
        connectorType,
        {
          timestamp: date1,
        },
        { configurationUtilities }
      )
    ).toEqual({ timestamp: date1 });
    expect(
      validateParams(
        connectorType,
        {
          timestamp: date2,
        },
        { configurationUtilities }
      )
    ).toEqual({ timestamp: date2 });
    expect(
      validateParams(
        connectorType,
        {
          timestamp: date3,
        },
        { configurationUtilities }
      )
    ).toEqual({ timestamp: date3 });
  });

  test('should validate and throw error when timestamp is invalid', () => {
    const timestamp = `1963-09-55 90:23:45`;
    expect(() => {
      validateParams(
        connectorType,
        {
          timestamp,
        },
        { configurationUtilities }
      );
    }).toThrowError(`error validating action params: error parsing timestamp "${timestamp}"`);
  });

  test('should validate and throw error when dedupKey is missing on resolve', () => {
    expect(() => {
      validateParams(
        connectorType,
        {
          eventAction: 'resolve',
        },
        { configurationUtilities }
      );
    }).toThrowError(
      `error validating action params: DedupKey is required when eventAction is "resolve"`
    );
  });
});

describe('execute()', () => {
  beforeEach(() => {
    postPagerdutyMock.mockReset();
  });

  test('should succeed with minimal valid params', async () => {
    const secrets = { routingKey: 'super-secret' };
    const config = { apiUrl: null };
    const params = {};

    postPagerdutyMock.mockImplementation(() => {
      return { status: 202, data: 'data-here' };
    });

    const actionId = 'some-action-id';
    const executorOptions: PagerDutyConnectorTypeExecutorOptions = {
      actionId,
      config,
      params,
      secrets,
      services,
      configurationUtilities,
      logger: mockedLogger,
    };
    const actionResponse = await connectorType.executor(executorOptions);
    const { apiUrl, data, headers } = postPagerdutyMock.mock.calls[0][0];
    expect({ apiUrl, data, headers }).toMatchInlineSnapshot(`
      Object {
        "apiUrl": "https://events.pagerduty.com/v2/enqueue",
        "data": Object {
          "event_action": "trigger",
          "payload": Object {
            "severity": "info",
            "source": "Kibana Action some-action-id",
            "summary": "No summary provided.",
          },
        },
        "headers": Object {
          "Content-Type": "application/json",
          "X-Routing-Key": "super-secret",
        },
      }
    `);
    expect(actionResponse).toMatchInlineSnapshot(`
      Object {
        "actionId": "some-action-id",
        "data": "data-here",
        "status": "ok",
      }
    `);
  });

  test('should succeed with maximal valid params for trigger', async () => {
    const randoDate = new Date('1963-09-23T01:23:45Z').toISOString();
    const secrets = {
      routingKey: 'super-secret',
    };
    const config = {
      apiUrl: 'the-api-url',
    };
    const params: ActionParamsType = {
      eventAction: 'trigger',
      dedupKey: 'a-dedup-key',
      summary: 'the summary',
      source: 'the-source',
      severity: 'critical',
      timestamp: randoDate,
      component: 'the-component',
      group: 'the-group',
      class: 'the-class',
    };

    postPagerdutyMock.mockImplementation(() => {
      return { status: 202, data: 'data-here' };
    });

    const actionId = 'some-action-id';
    const executorOptions: PagerDutyConnectorTypeExecutorOptions = {
      actionId,
      config,
      params,
      secrets,
      services,
      configurationUtilities,
      logger: mockedLogger,
    };
    const actionResponse = await connectorType.executor(executorOptions);
    const { apiUrl, data, headers } = postPagerdutyMock.mock.calls[0][0];
    expect({ apiUrl, data, headers }).toMatchInlineSnapshot(`
      Object {
        "apiUrl": "the-api-url",
        "data": Object {
          "dedup_key": "a-dedup-key",
          "event_action": "trigger",
          "payload": Object {
            "class": "the-class",
            "component": "the-component",
            "group": "the-group",
            "severity": "critical",
            "source": "the-source",
            "summary": "the summary",
            "timestamp": "1963-09-23T01:23:45.000Z",
          },
        },
        "headers": Object {
          "Content-Type": "application/json",
          "X-Routing-Key": "super-secret",
        },
      }
    `);
    expect(actionResponse).toMatchInlineSnapshot(`
      Object {
        "actionId": "some-action-id",
        "data": "data-here",
        "status": "ok",
      }
    `);
  });

  test('should succeed with maximal valid params for acknowledge', async () => {
    const randoDate = new Date('1963-09-23T01:23:45Z').toISOString();
    const secrets = {
      routingKey: 'super-secret',
    };
    const config = {
      apiUrl: 'the-api-url',
    };
    const params: ActionParamsType = {
      eventAction: 'acknowledge',
      dedupKey: 'a-dedup-key',
      summary: 'the summary',
      source: 'the-source',
      severity: 'critical',
      timestamp: randoDate,
      component: 'the-component',
      group: 'the-group',
      class: 'the-class',
    };

    postPagerdutyMock.mockImplementation(() => {
      return { status: 202, data: 'data-here' };
    });

    const actionId = 'some-action-id';
    const executorOptions: PagerDutyConnectorTypeExecutorOptions = {
      actionId,
      config,
      params,
      secrets,
      services,
      configurationUtilities,
      logger: mockedLogger,
    };
    const actionResponse = await connectorType.executor(executorOptions);
    const { apiUrl, data, headers } = postPagerdutyMock.mock.calls[0][0];
    expect({ apiUrl, data, headers }).toMatchInlineSnapshot(`
      Object {
        "apiUrl": "the-api-url",
        "data": Object {
          "dedup_key": "a-dedup-key",
          "event_action": "acknowledge",
        },
        "headers": Object {
          "Content-Type": "application/json",
          "X-Routing-Key": "super-secret",
        },
      }
    `);
    expect(actionResponse).toMatchInlineSnapshot(`
      Object {
        "actionId": "some-action-id",
        "data": "data-here",
        "status": "ok",
      }
    `);
  });

  test('should succeed with maximal valid params for resolve', async () => {
    const randoDate = new Date('1963-09-23T01:23:45Z').toISOString();
    const secrets = {
      routingKey: 'super-secret',
    };
    const config = {
      apiUrl: 'the-api-url',
    };
    const params: ActionParamsType = {
      eventAction: 'resolve',
      dedupKey: 'a-dedup-key',
      summary: 'the summary',
      source: 'the-source',
      severity: 'critical',
      timestamp: randoDate,
      component: 'the-component',
      group: 'the-group',
      class: 'the-class',
    };

    postPagerdutyMock.mockImplementation(() => {
      return { status: 202, data: 'data-here' };
    });

    const actionId = 'some-action-id';
    const executorOptions: PagerDutyConnectorTypeExecutorOptions = {
      actionId,
      config,
      params,
      secrets,
      services,
      configurationUtilities,
      logger: mockedLogger,
    };
    const actionResponse = await connectorType.executor(executorOptions);
    const { apiUrl, data, headers } = postPagerdutyMock.mock.calls[0][0];
    expect({ apiUrl, data, headers }).toMatchInlineSnapshot(`
      Object {
        "apiUrl": "the-api-url",
        "data": Object {
          "dedup_key": "a-dedup-key",
          "event_action": "resolve",
        },
        "headers": Object {
          "Content-Type": "application/json",
          "X-Routing-Key": "super-secret",
        },
      }
    `);
    expect(actionResponse).toMatchInlineSnapshot(`
      Object {
        "actionId": "some-action-id",
        "data": "data-here",
        "status": "ok",
      }
    `);
  });

  test('should fail when sendPagerduty throws', async () => {
    const secrets = { routingKey: 'super-secret' };
    const config = { apiUrl: null };
    const params = {};

    postPagerdutyMock.mockImplementation(() => {
      throw new Error('doing some testing');
    });

    const actionId = 'some-action-id';
    const executorOptions: PagerDutyConnectorTypeExecutorOptions = {
      actionId,
      config,
      params,
      secrets,
      services,
      configurationUtilities,
      logger: mockedLogger,
    };
    const actionResponse = await connectorType.executor(executorOptions);
    expect(actionResponse).toMatchInlineSnapshot(`
      Object {
        "actionId": "some-action-id",
        "message": "error posting pagerduty event",
        "serviceMessage": "doing some testing",
        "status": "error",
      }
    `);
  });

  test('should fail when sendPagerdury returns 429', async () => {
    const secrets = { routingKey: 'super-secret' };
    const config = { apiUrl: null };
    const params = {};

    postPagerdutyMock.mockImplementation(() => {
      return { status: 429, data: 'data-here' };
    });

    const actionId = 'some-action-id';
    const executorOptions: PagerDutyConnectorTypeExecutorOptions = {
      actionId,
      config,
      params,
      secrets,
      services,
      configurationUtilities,
      logger: mockedLogger,
    };
    const actionResponse = await connectorType.executor(executorOptions);
    expect(actionResponse).toMatchInlineSnapshot(`
      Object {
        "actionId": "some-action-id",
        "message": "error posting pagerduty event: http status 429, retry later",
        "retry": true,
        "status": "error",
      }
    `);
  });

  test('should fail when sendPagerdury returns 501', async () => {
    const secrets = { routingKey: 'super-secret' };
    const config = { apiUrl: null };
    const params = {};

    postPagerdutyMock.mockImplementation(() => {
      return { status: 501, data: 'data-here' };
    });

    const actionId = 'some-action-id';
    const executorOptions: PagerDutyConnectorTypeExecutorOptions = {
      actionId,
      config,
      params,
      secrets,
      services,
      configurationUtilities,
      logger: mockedLogger,
    };
    const actionResponse = await connectorType.executor(executorOptions);
    expect(actionResponse).toMatchInlineSnapshot(`
      Object {
        "actionId": "some-action-id",
        "message": "error posting pagerduty event: http status 501, retry later",
        "retry": true,
        "status": "error",
      }
    `);
  });

  test('should fail when sendPagerdury returns 418', async () => {
    const secrets = { routingKey: 'super-secret' };
    const config = { apiUrl: null };
    const params = {};

    postPagerdutyMock.mockImplementation(() => {
      return { status: 418, data: 'data-here' };
    });

    const actionId = 'some-action-id';
    const executorOptions: PagerDutyConnectorTypeExecutorOptions = {
      actionId,
      config,
      params,
      secrets,
      services,
      configurationUtilities,
      logger: mockedLogger,
    };
    const actionResponse = await connectorType.executor(executorOptions);
    expect(actionResponse).toMatchInlineSnapshot(`
      Object {
        "actionId": "some-action-id",
        "message": "error posting pagerduty event: unexpected status 418",
        "status": "error",
      }
    `);
  });

  test('should not set a default dedupkey to ensure each execution is a unique PagerDuty incident', async () => {
    const randoDate = new Date('1963-09-23T01:23:45Z').toISOString();
    const secrets = {
      routingKey: 'super-secret',
    };
    const config = {
      apiUrl: 'the-api-url',
    };
    const params: ActionParamsType = {
      eventAction: 'trigger',
      summary: 'the summary',
      source: 'the-source',
      severity: 'critical',
      timestamp: randoDate,
    };

    postPagerdutyMock.mockImplementation(() => {
      return { status: 202, data: 'data-here' };
    });

    const actionId = 'some-action-id';
    const executorOptions: PagerDutyConnectorTypeExecutorOptions = {
      actionId,
      config,
      params,
      secrets,
      services,
      configurationUtilities,
      logger: mockedLogger,
    };
    const actionResponse = await connectorType.executor(executorOptions);
    const { apiUrl, data, headers } = postPagerdutyMock.mock.calls[0][0];
    expect({ apiUrl, data, headers }).toMatchInlineSnapshot(`
      Object {
        "apiUrl": "the-api-url",
        "data": Object {
          "event_action": "trigger",
          "payload": Object {
            "severity": "critical",
            "source": "the-source",
            "summary": "the summary",
            "timestamp": "1963-09-23T01:23:45.000Z",
          },
        },
        "headers": Object {
          "Content-Type": "application/json",
          "X-Routing-Key": "super-secret",
        },
      }
    `);
    expect(actionResponse).toMatchInlineSnapshot(`
      Object {
        "actionId": "some-action-id",
        "data": "data-here",
        "status": "ok",
      }
    `);
  });

  test('should succeed when timestamp contains valid date and extraneous spaces', async () => {
    const randoDate = '1963-09-23 01:23:45';
    const secrets = {
      routingKey: 'super-secret',
    };
    const config = {
      apiUrl: 'the-api-url',
    };
    const params: ActionParamsType = {
      eventAction: 'trigger',
      dedupKey: 'a-dedup-key',
      summary: 'the summary',
      source: 'the-source',
      severity: 'critical',
      timestamp: `   ${randoDate}  `,
      component: 'the-component',
      group: 'the-group',
      class: 'the-class',
    };

    postPagerdutyMock.mockImplementation(() => {
      return { status: 202, data: 'data-here' };
    });

    const actionId = 'some-action-id';
    const executorOptions: PagerDutyConnectorTypeExecutorOptions = {
      actionId,
      config,
      params,
      secrets,
      services,
      configurationUtilities,
      logger: mockedLogger,
    };
    const actionResponse = await connectorType.executor(executorOptions);
    const { apiUrl, data, headers } = postPagerdutyMock.mock.calls[0][0];
    expect({ apiUrl, data, headers }).toMatchInlineSnapshot(`
      Object {
        "apiUrl": "the-api-url",
        "data": Object {
          "dedup_key": "a-dedup-key",
          "event_action": "trigger",
          "payload": Object {
            "class": "the-class",
            "component": "the-component",
            "group": "the-group",
            "severity": "critical",
            "source": "the-source",
            "summary": "the summary",
            "timestamp": "${moment(randoDate).toISOString()}",
          },
        },
        "headers": Object {
          "Content-Type": "application/json",
          "X-Routing-Key": "super-secret",
        },
      }
    `);
    expect(actionResponse).toMatchInlineSnapshot(`
      Object {
        "actionId": "some-action-id",
        "data": "data-here",
        "status": "ok",
      }
    `);
  });

  test('should not pass timestamp field when timestamp is empty string', async () => {
    const secrets = {
      routingKey: 'super-secret',
    };
    const config = {
      apiUrl: 'the-api-url',
    };
    const params: ActionParamsType = {
      eventAction: 'trigger',
      dedupKey: 'a-dedup-key',
      summary: 'the summary',
      source: 'the-source',
      severity: 'critical',
      timestamp: '',
      component: 'the-component',
      group: 'the-group',
      class: 'the-class',
    };

    postPagerdutyMock.mockImplementation(() => {
      return { status: 202, data: 'data-here' };
    });

    const actionId = 'some-action-id';
    const executorOptions: PagerDutyConnectorTypeExecutorOptions = {
      actionId,
      config,
      params,
      secrets,
      services,
      configurationUtilities,
      logger: mockedLogger,
    };
    const actionResponse = await connectorType.executor(executorOptions);
    const { apiUrl, data, headers } = postPagerdutyMock.mock.calls[0][0];
    expect({ apiUrl, data, headers }).toMatchInlineSnapshot(`
      Object {
        "apiUrl": "the-api-url",
        "data": Object {
          "dedup_key": "a-dedup-key",
          "event_action": "trigger",
          "payload": Object {
            "class": "the-class",
            "component": "the-component",
            "group": "the-group",
            "severity": "critical",
            "source": "the-source",
            "summary": "the summary",
          },
        },
        "headers": Object {
          "Content-Type": "application/json",
          "X-Routing-Key": "super-secret",
        },
      }
    `);
    expect(actionResponse).toMatchInlineSnapshot(`
      Object {
        "actionId": "some-action-id",
        "data": "data-here",
        "status": "ok",
      }
    `);
  });

  test('should not pass timestamp field when timestamp is string of spaces', async () => {
    const secrets = {
      routingKey: 'super-secret',
    };
    const config = {
      apiUrl: 'the-api-url',
    };
    const params: ActionParamsType = {
      eventAction: 'trigger',
      dedupKey: 'a-dedup-key',
      summary: 'the summary',
      source: 'the-source',
      severity: 'critical',
      timestamp: '   ',
      component: 'the-component',
      group: 'the-group',
      class: 'the-class',
    };

    postPagerdutyMock.mockImplementation(() => {
      return { status: 202, data: 'data-here' };
    });

    const actionId = 'some-action-id';
    const executorOptions: PagerDutyConnectorTypeExecutorOptions = {
      actionId,
      config,
      params,
      secrets,
      services,
      configurationUtilities,
      logger: mockedLogger,
    };
    const actionResponse = await connectorType.executor(executorOptions);
    const { apiUrl, data, headers } = postPagerdutyMock.mock.calls[0][0];
    expect({ apiUrl, data, headers }).toMatchInlineSnapshot(`
      Object {
        "apiUrl": "the-api-url",
        "data": Object {
          "dedup_key": "a-dedup-key",
          "event_action": "trigger",
          "payload": Object {
            "class": "the-class",
            "component": "the-component",
            "group": "the-group",
            "severity": "critical",
            "source": "the-source",
            "summary": "the summary",
          },
        },
        "headers": Object {
          "Content-Type": "application/json",
          "X-Routing-Key": "super-secret",
        },
      }
    `);
    expect(actionResponse).toMatchInlineSnapshot(`
      Object {
        "actionId": "some-action-id",
        "data": "data-here",
        "status": "ok",
      }
    `);
  });
});
