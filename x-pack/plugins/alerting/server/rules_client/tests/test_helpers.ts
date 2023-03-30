/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObject } from '@kbn/core-saved-objects-server';

export const savedObjectWith500Error = {
  id: 'id2',
  error: {
    error: '',
    message: 'UPS',
    statusCode: 500,
  },
  version: '1',
} as SavedObject;

export const savedObjectWith409Error = {
  id: 'id2',
  error: {
    error: '',
    message: 'UPS',
    statusCode: 409,
  },
  version: '1',
} as SavedObject;

export const defaultRule = {
  id: 'id1',
  type: 'alert',
  attributes: {
    name: 'fakeName',
    consumer: 'fakeConsumer',
    alertTypeId: 'fakeType',
    schedule: { interval: '5m' },
    actions: [] as unknown,
  },
  references: [],
  version: '1',
};

export const enabledRule1 = {
  ...defaultRule,
  attributes: {
    ...defaultRule.attributes,
    enabled: true,
    scheduledTaskId: 'id1',
    apiKey: Buffer.from('123:abc').toString('base64'),
  },
};

export const enabledRule2 = {
  ...defaultRule,
  id: 'id2',
  attributes: {
    ...defaultRule.attributes,
    enabled: true,
    scheduledTaskId: 'id2',
    apiKey: Buffer.from('321:abc').toString('base64'),
  },
};

export const disabledRule1 = {
  ...defaultRule,
  attributes: {
    ...defaultRule.attributes,
    enabled: false,
    scheduledTaskId: 'id1',
    apiKey: Buffer.from('123:abc').toString('base64'),
  },
};

export const disabledRule2 = {
  ...defaultRule,
  id: 'id2',
  attributes: {
    ...defaultRule.attributes,
    enabled: false,
    scheduledTaskId: 'id2',
    apiKey: Buffer.from('321:abc').toString('base64'),
  },
};

export const disabledRuleWithAction1 = {
  ...disabledRule1,
  attributes: {
    ...disabledRule1.attributes,
    actions: [
      {
        group: 'default',
        actionTypeId: '1',
        actionRef: '1',
        params: {
          foo: true,
        },
      },
    ],
  },
};

export const disabledRuleWithAction2 = {
  ...disabledRule2,
  attributes: {
    ...disabledRule2.attributes,
    actions: [
      {
        group: 'default',
        actionTypeId: '1',
        actionRef: '1',
        params: {
          foo: true,
        },
      },
    ],
  },
};

export const returnedRule1 = {
  actions: [],
  alertTypeId: 'fakeType',
  apiKey: 'MTIzOmFiYw==',
  consumer: 'fakeConsumer',
  enabled: true,
  id: 'id1',
  name: 'fakeName',
  notifyWhen: undefined,
  params: undefined,
  schedule: {
    interval: '5m',
  },
  scheduledTaskId: 'id1',
  snoozeSchedule: [],
};

export const returnedRule2 = {
  actions: [],
  alertTypeId: 'fakeType',
  apiKey: 'MzIxOmFiYw==',
  consumer: 'fakeConsumer',
  enabled: true,
  id: 'id2',
  name: 'fakeName',
  notifyWhen: undefined,
  params: undefined,
  schedule: {
    interval: '5m',
  },
  scheduledTaskId: 'id2',
  snoozeSchedule: [],
};

export const returnedDisabledRule1 = {
  ...returnedRule1,
  enabled: false,
};

export const returnedDisabledRule2 = {
  ...returnedRule2,
  enabled: false,
};
