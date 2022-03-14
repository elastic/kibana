/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  throwIfAbsent,
  throwIfIsntContained,
  isValidUrl,
  getConnectorWithInvalidatedFields,
  getRuleWithInvalidatedFields,
} from './value_validators';
import uuid from 'uuid';
import { Rule, IErrorObject, UserConfiguredActionConnector } from '../../types';

describe('throwIfAbsent', () => {
  test('throws if value is absent', () => {
    [undefined, null].forEach((val) => {
      expect(() => {
        throwIfAbsent('OMG no value')(val);
      }).toThrowErrorMatchingInlineSnapshot(`"OMG no value"`);
    });
  });

  test('doesnt throws if value is present but falsey', () => {
    [false, ''].forEach((val) => {
      expect(throwIfAbsent('OMG no value')(val)).toEqual(val);
    });
  });

  test('doesnt throw if value is present', () => {
    expect(throwIfAbsent('OMG no value')({})).toEqual({});
  });
});

describe('throwIfIsntContained', () => {
  test('throws if value is absent', () => {
    expect(() => {
      throwIfIsntContained<string>(new Set([uuid.v4()]), 'OMG no value', (val) => val)([uuid.v4()]);
    }).toThrowErrorMatchingInlineSnapshot(`"OMG no value"`);
  });

  test('throws if value is absent using custom message', () => {
    const id = uuid.v4();
    expect(() => {
      throwIfIsntContained<string>(
        new Set([id]),
        (value: string) => `OMG no ${value}`,
        (val) => val
      )([uuid.v4()]);
    }).toThrow(`OMG no ${id}`);
  });

  test('returns values if value is present', () => {
    const id = uuid.v4();
    const values = [uuid.v4(), uuid.v4(), id, uuid.v4()];
    expect(
      throwIfIsntContained<string>(new Set([id]), 'OMG no value', (val) => val)(values)
    ).toEqual(values);
  });

  test('returns values if multiple values is present', () => {
    const [firstId, secondId] = [uuid.v4(), uuid.v4()];
    const values = [uuid.v4(), uuid.v4(), secondId, uuid.v4(), firstId];
    expect(
      throwIfIsntContained<string>(
        new Set([firstId, secondId]),
        'OMG no value',
        (val) => val
      )(values)
    ).toEqual(values);
  });

  test('allows a custom value extractor', () => {
    const [firstId, secondId] = [uuid.v4(), uuid.v4()];
    const values = [
      { id: firstId, some: 'prop' },
      { id: secondId, someOther: 'prop' },
    ];
    expect(
      throwIfIsntContained<{ id: string }>(
        new Set([firstId, secondId]),
        'OMG no value',
        (val: { id: string }) => val.id
      )(values)
    ).toEqual(values);
  });
});

describe('isValidUrl', () => {
  test('verifies invalid url', () => {
    expect(isValidUrl('this is not a url')).toBeFalsy();
  });

  test('verifies valid url any protocol', () => {
    expect(isValidUrl('https://www.elastic.co/')).toBeTruthy();
  });

  test('verifies valid url with specific protocol', () => {
    expect(isValidUrl('https://www.elastic.co/', 'https:')).toBeTruthy();
  });
});

describe('getConnectorWithInvalidatedFields', () => {
  test('set nulls to all required undefined fields in connector secrets', () => {
    const connector: UserConfiguredActionConnector<{}, { webhookUrl: string }> = {
      secrets: {} as any,
      id: 'test',
      actionTypeId: '.slack',
      name: 'slack',
      config: {},
      isPreconfigured: false,
    };
    const secretsErrors = { webhookUrl: ['Webhook URL is required.'] };
    const configErrors = {};
    const baseConnectorErrors = {};
    getConnectorWithInvalidatedFields(connector, configErrors, secretsErrors, baseConnectorErrors);
    expect(connector.secrets.webhookUrl).toBeNull();
  });

  test('set nulls to all required undefined fields in connector config', () => {
    const connector: UserConfiguredActionConnector<{ apiUrl: string }, {}> = {
      secrets: {},
      id: 'test',
      actionTypeId: '.jira',
      name: 'jira',
      config: {} as any,
      isPreconfigured: false,
    };
    const secretsErrors = {};
    const configErrors = { apiUrl: ['apiUrl is required'] };
    const baseConnectorErrors = {};
    getConnectorWithInvalidatedFields(connector, configErrors, secretsErrors, baseConnectorErrors);
    expect(connector.config.apiUrl).toBeNull();
  });

  test('do not set nulls to the invalid fields with values in the connector properties, config and secrets', () => {
    const connector: UserConfiguredActionConnector<{}, { webhookUrl: string }> = {
      secrets: {
        webhookUrl: 'http://test',
      },
      id: 'test',
      actionTypeId: '.slack',
      name: 'slack',
      config: {},
      isPreconfigured: false,
    };
    const secretsErrors = { webhookUrl: ['Webhook URL must start with https://.'] };
    const configErrors = {};
    const baseConnectorErrors = {};
    getConnectorWithInvalidatedFields(connector, configErrors, secretsErrors, baseConnectorErrors);
    expect(connector.secrets.webhookUrl).toEqual('http://test');
  });
});

describe('getRuleWithInvalidatedFields', () => {
  test('sets to null all fields that are required but undefined in rule', () => {
    const rule: Rule = {
      params: {},
      consumer: 'test',
      schedule: {
        interval: '1m',
      },
      actions: [],
      tags: [],
      muteAll: false,
      enabled: false,
      mutedInstanceIds: [],
    } as any;
    const baseAlertErrors = {
      name: ['Name is required.'],
      ruleTypeId: ['Rule type is required.'],
    };
    const actionsErrors: IErrorObject[] = [];
    const paramsErrors = {};
    getRuleWithInvalidatedFields(rule, paramsErrors, baseAlertErrors, actionsErrors);
    expect(rule.name).toBeNull();
    expect(rule.ruleTypeId).toBeNull();
  });

  test('handles undefined fields with dot notation', () => {
    const rule: Rule = {
      params: {},
      consumer: 'test',
      schedule: {
        interval: undefined,
      },
      actions: [],
      tags: [],
      muteAll: false,
      enabled: false,
      mutedInstanceIds: [],
    } as any;
    const baseAlertErrors = {
      'schedule.interval': ['Interval is required.'],
    };
    const actionsErrors: IErrorObject[] = [];
    const paramsErrors = {};
    getRuleWithInvalidatedFields(rule, paramsErrors, baseAlertErrors, actionsErrors);
    expect(rule.schedule.interval).toBeNull();
  });

  test('does not set to null any fields that are required and defined but invalid in rule', () => {
    const rule: Rule = {
      name: 'test',
      id: '123',
      params: {},
      consumer: '@@@@',
      schedule: {
        interval: '1m',
      },
      actions: [],
      tags: [],
      muteAll: false,
      enabled: false,
      mutedInstanceIds: [],
    } as any;
    const baseAlertErrors = { consumer: ['Consumer is invalid.'] };
    const actionsErrors: IErrorObject[] = [];
    const paramsErrors = {};
    getRuleWithInvalidatedFields(rule, paramsErrors, baseAlertErrors, actionsErrors);
    expect(rule.consumer).toEqual('@@@@');
  });

  test('handles defined but invalid fields with dot notation', () => {
    const rule: Rule = {
      params: {},
      consumer: 'test',
      schedule: {
        interval: '1s',
      },
      actions: [],
      tags: [],
      muteAll: false,
      enabled: false,
      mutedInstanceIds: [],
    } as any;
    const baseAlertErrors = {
      'schedule.interval': ['Interval is too short.'],
    };
    const actionsErrors: IErrorObject[] = [];
    const paramsErrors = {};
    getRuleWithInvalidatedFields(rule, paramsErrors, baseAlertErrors, actionsErrors);
    expect(rule.schedule.interval).toEqual('1s');
  });

  test('set to null all fields that are required but undefined in rule params', () => {
    const rule: Rule = {
      name: 'test',
      ruleTypeId: '.threshold',
      id: '123',
      params: {},
      consumer: 'test',
      schedule: {
        interval: '1m',
      },
      actions: [],
      tags: [],
      muteAll: false,
      enabled: false,
      mutedInstanceIds: [],
      createdBy: '',
      apiKeyOwner: '',
      createdAt: new Date(),
      executionStatus: {
        status: 'ok',
        lastExecutionDate: new Date(),
      },
      notifyWhen: 'onActionGroupChange',
      throttle: '',
      updatedAt: new Date(),
      updatedBy: '',
    };
    const baseAlertErrors = {};
    const actionsErrors: IErrorObject[] = [];
    const paramsErrors = { index: ['Index is required.'], timeField: ['Time field is required.'] };
    getRuleWithInvalidatedFields(rule, paramsErrors, baseAlertErrors, actionsErrors);
    expect(rule.params.index).toBeNull();
    expect(rule.params.timeField).toBeNull();
  });

  test('does not set to null any fields that are required and defined but invalid in rule params', () => {
    const rule: Rule = {
      name: 'test',
      ruleTypeId: '.threshold',
      id: '123',
      params: {
        aggField: 'foo',
        termSize: 'big',
      },
      consumer: 'test',
      schedule: {
        interval: '1m',
      },
      actions: [],
      tags: [],
      muteAll: false,
      enabled: false,
      mutedInstanceIds: [],
      createdBy: '',
      apiKeyOwner: '',
      createdAt: new Date(),
      executionStatus: {
        status: 'ok',
        lastExecutionDate: new Date(),
      },
      notifyWhen: 'onActionGroupChange',
      throttle: '',
      updatedAt: new Date(),
      updatedBy: '',
    };
    const baseAlertErrors = {};
    const actionsErrors: IErrorObject[] = [];
    const paramsErrors = {
      aggField: ['Aggregation field is invalid.'],
      termSize: ['Term size is invalid.'],
    };
    getRuleWithInvalidatedFields(rule, paramsErrors, baseAlertErrors, actionsErrors);
    expect(rule.params.aggField).toEqual('foo');
    expect(rule.params.termSize).toEqual('big');
  });

  test('set to null all fields that are required but undefined in rule actions', () => {
    const rule: Rule = {
      name: 'test',
      ruleTypeId: '.threshold',
      id: '123',
      params: {},
      consumer: 'test',
      schedule: {
        interval: '1m',
      },
      actions: [
        {
          actionTypeId: 'test',
          group: 'qwer',
          id: '123',
          params: {
            incident: {
              field: {},
            },
          },
        },
      ],
      tags: [],
      muteAll: false,
      enabled: false,
      mutedInstanceIds: [],
      createdBy: '',
      apiKeyOwner: '',
      createdAt: new Date(),
      executionStatus: {
        status: 'ok',
        lastExecutionDate: new Date(),
      },
      notifyWhen: 'onActionGroupChange',
      throttle: '',
      updatedAt: new Date(),
      updatedBy: '',
    };
    const baseAlertErrors = {};
    const actionsErrors = [{ 'incident.field.name': ['Name is required.'] }];
    const paramsErrors = {};
    getRuleWithInvalidatedFields(rule, paramsErrors, baseAlertErrors, actionsErrors);
    expect((rule.actions[0].params as any).incident.field.name).toBeNull();
  });

  test('validates multiple rule actions with the same connector id', () => {
    const rule: Rule = {
      name: 'test',
      ruleTypeId: '.threshold',
      id: '123',
      params: {},
      consumer: 'test',
      schedule: {
        interval: '1m',
      },
      actions: [
        {
          actionTypeId: 'test',
          group: 'qwer',
          id: '123',
          params: {
            incident: {
              field: {},
            },
          },
        },
        {
          actionTypeId: 'test',
          group: 'qwer',
          id: '123',
          params: {
            incident: {
              field: {
                name: 'myIncident',
              },
            },
          },
        },
      ],
      tags: [],
      muteAll: false,
      enabled: false,
      mutedInstanceIds: [],
      createdBy: '',
      apiKeyOwner: '',
      createdAt: new Date(),
      executionStatus: {
        status: 'ok',
        lastExecutionDate: new Date(),
      },
      notifyWhen: 'onActionGroupChange',
      throttle: '',
      updatedAt: new Date(),
      updatedBy: '',
    };
    const baseAlertErrors = {};
    const actionsErrors = [
      { 'incident.field.name': ['Name is required.'] },
      { 'incident.field.name': ['Name is invalid.'] },
    ];
    const paramsErrors = {};
    getRuleWithInvalidatedFields(rule, paramsErrors, baseAlertErrors, actionsErrors);
    expect((rule.actions[0].params as any).incident.field.name).toBeNull();
    expect((rule.actions[1].params as any).incident.field.name).toEqual('myIncident');
  });
});
