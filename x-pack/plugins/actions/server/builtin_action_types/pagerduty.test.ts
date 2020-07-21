/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

jest.mock('./lib/post_pagerduty', () => ({
  postPagerduty: jest.fn(),
}));

import { Services } from '../types';
import { validateConfig, validateSecrets, validateParams } from '../lib';
import { postPagerduty } from './lib/post_pagerduty';
import { createActionTypeRegistry } from './index.test';
import { Logger } from '../../../../../src/core/server';
import { actionsConfigMock } from '../actions_config.mock';
import { actionsMock } from '../mocks';
import {
  ActionParamsType,
  ActionTypeConfigType,
  ActionTypeSecretsType,
  getActionType,
  PagerDutyActionType,
  PagerDutyActionTypeExecutorOptions,
} from './pagerduty';

const postPagerdutyMock = postPagerduty as jest.Mock;

const ACTION_TYPE_ID = '.pagerduty';

const services: Services = actionsMock.createServices();

let actionType: PagerDutyActionType;
let mockedLogger: jest.Mocked<Logger>;

beforeAll(() => {
  const { logger, actionTypeRegistry } = createActionTypeRegistry();
  actionType = actionTypeRegistry.get<
    ActionTypeConfigType,
    ActionTypeSecretsType,
    ActionParamsType
  >(ACTION_TYPE_ID);
  mockedLogger = logger;
});

describe('get()', () => {
  test('should return correct action type', () => {
    expect(actionType.id).toEqual(ACTION_TYPE_ID);
    expect(actionType.name).toEqual('PagerDuty');
  });
});

describe('validateConfig()', () => {
  test('should validate and pass when config is valid', () => {
    expect(validateConfig(actionType, {})).toEqual({ apiUrl: null });
    expect(validateConfig(actionType, { apiUrl: 'bar' })).toEqual({ apiUrl: 'bar' });
  });

  test('should validate and throw error when config is invalid', () => {
    expect(() => {
      validateConfig(actionType, { shouldNotBeHere: true });
    }).toThrowErrorMatchingInlineSnapshot(
      `"error validating action type config: [shouldNotBeHere]: definition for this key is missing"`
    );
  });

  test('should validate and pass when the pagerduty url is whitelisted', () => {
    actionType = getActionType({
      logger: mockedLogger,
      configurationUtilities: {
        ...actionsConfigMock.create(),
        ensureWhitelistedUri: (url) => {
          expect(url).toEqual('https://events.pagerduty.com/v2/enqueue');
        },
      },
    });

    expect(
      validateConfig(actionType, { apiUrl: 'https://events.pagerduty.com/v2/enqueue' })
    ).toEqual({ apiUrl: 'https://events.pagerduty.com/v2/enqueue' });
  });

  test('config validation returns an error if the specified URL isnt whitelisted', () => {
    actionType = getActionType({
      logger: mockedLogger,
      configurationUtilities: {
        ...actionsConfigMock.create(),
        ensureWhitelistedUri: (_) => {
          throw new Error(`target url is not whitelisted`);
        },
      },
    });

    expect(() => {
      validateConfig(actionType, { apiUrl: 'https://events.pagerduty.com/v2/enqueue' });
    }).toThrowErrorMatchingInlineSnapshot(
      `"error validating action type config: error configuring pagerduty action: target url is not whitelisted"`
    );
  });
});

describe('validateSecrets()', () => {
  test('should validate and pass when secrets is valid', () => {
    const routingKey = 'super-secret';
    expect(validateSecrets(actionType, { routingKey })).toEqual({
      routingKey,
    });
  });

  test('should validate and throw error when secrets is invalid', () => {
    expect(() => {
      validateSecrets(actionType, { routingKey: false });
    }).toThrowErrorMatchingInlineSnapshot(
      `"error validating action type secrets: [routingKey]: expected value of type [string] but got [boolean]"`
    );

    expect(() => {
      validateSecrets(actionType, {});
    }).toThrowErrorMatchingInlineSnapshot(
      `"error validating action type secrets: [routingKey]: expected value of type [string] but got [undefined]"`
    );
  });
});

describe('validateParams()', () => {
  test('should validate and pass when params is valid', () => {
    expect(validateParams(actionType, {})).toEqual({});

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
    expect(validateParams(actionType, params)).toEqual(params);
  });

  test('should validate and throw error when params is invalid', () => {
    expect(() => {
      validateParams(actionType, { eventAction: 'ackynollage' });
    }).toThrowErrorMatchingInlineSnapshot(`
"error validating action params: [eventAction]: types that failed validation:
- [eventAction.0]: expected value to equal [trigger]
- [eventAction.1]: expected value to equal [resolve]
- [eventAction.2]: expected value to equal [acknowledge]"
`);
  });

  test('should validate and throw error when timestamp has spaces', () => {
    const randoDate = new Date('1963-09-23T01:23:45Z').toISOString();
    const timestamp = `  ${randoDate}`;
    expect(() => {
      validateParams(actionType, {
        timestamp,
      });
    }).toThrowError(`error validating action params: error parsing timestamp "${timestamp}"`);
  });

  test('should validate and throw error when timestamp is invalid', () => {
    const timestamp = `1963-09-55 90:23:45`;
    expect(() => {
      validateParams(actionType, {
        timestamp,
      });
    }).toThrowError(`error validating action params: error parsing timestamp "${timestamp}"`);
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
    const executorOptions: PagerDutyActionTypeExecutorOptions = {
      actionId,
      config,
      params,
      secrets,
      services,
    };
    const actionResponse = await actionType.executor(executorOptions);
    const { apiUrl, data, headers } = postPagerdutyMock.mock.calls[0][0];
    expect({ apiUrl, data, headers }).toMatchInlineSnapshot(`
      Object {
        "apiUrl": "https://events.pagerduty.com/v2/enqueue",
        "data": Object {
          "dedup_key": "action:some-action-id",
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
    const executorOptions: PagerDutyActionTypeExecutorOptions = {
      actionId,
      config,
      params,
      secrets,
      services,
    };
    const actionResponse = await actionType.executor(executorOptions);
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
    const executorOptions: PagerDutyActionTypeExecutorOptions = {
      actionId,
      config,
      params,
      secrets,
      services,
    };
    const actionResponse = await actionType.executor(executorOptions);
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
    const executorOptions: PagerDutyActionTypeExecutorOptions = {
      actionId,
      config,
      params,
      secrets,
      services,
    };
    const actionResponse = await actionType.executor(executorOptions);
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

  test('should fail when sendPagerdury throws', async () => {
    const secrets = { routingKey: 'super-secret' };
    const config = { apiUrl: null };
    const params = {};

    postPagerdutyMock.mockImplementation(() => {
      throw new Error('doing some testing');
    });

    const actionId = 'some-action-id';
    const executorOptions: PagerDutyActionTypeExecutorOptions = {
      actionId,
      config,
      params,
      secrets,
      services,
    };
    const actionResponse = await actionType.executor(executorOptions);
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
    const executorOptions: PagerDutyActionTypeExecutorOptions = {
      actionId,
      config,
      params,
      secrets,
      services,
    };
    const actionResponse = await actionType.executor(executorOptions);
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
    const executorOptions: PagerDutyActionTypeExecutorOptions = {
      actionId,
      config,
      params,
      secrets,
      services,
    };
    const actionResponse = await actionType.executor(executorOptions);
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
    const executorOptions: PagerDutyActionTypeExecutorOptions = {
      actionId,
      config,
      params,
      secrets,
      services,
    };
    const actionResponse = await actionType.executor(executorOptions);
    expect(actionResponse).toMatchInlineSnapshot(`
      Object {
        "actionId": "some-action-id",
        "message": "error posting pagerduty event: unexpected status 418",
        "status": "error",
      }
    `);
  });
});
