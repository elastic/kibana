/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { AlertConsumers } from '@kbn/rule-data-utils';

import type { SavedObject } from '@kbn/core-saved-objects-server';
import { RULE_SAVED_OBJECT_TYPE } from '../../saved_objects';

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
  type: RULE_SAVED_OBJECT_TYPE,
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

export const defaultRuleForBulkDelete = {
  id: 'id1',
  type: RULE_SAVED_OBJECT_TYPE,
  attributes: {
    tags: ['ups'],
    params: { param: 1 },
    muteAll: false,
    mutedInstanceIds: [],
    revision: 1,
    name: 'fakeName',
    consumer: 'fakeConsumer',
    alertTypeId: 'fakeType',
    schedule: { interval: '5m' },
    actions: [] as unknown,
    executionStatus: {
      lastExecutionDate: new Date('2019-02-12T21:01:22.000Z'),
      status: 'pending',
    },
    createdAt: new Date('2019-02-12T21:01:22.000Z'),
    updatedAt: new Date('2019-02-12T21:01:22.000Z'),
  },
  references: [],
  version: '1',
};

export const siemRule1 = {
  ...defaultRule,
  attributes: {
    ...defaultRule.attributes,
    consumer: AlertConsumers.SIEM,
    executionStatus: {
      lastExecutionDate: new Date('2019-02-12T21:01:22.000Z'),
      status: 'pending',
    },
  },
  id: 'siem-id1',
};

export const siemRuleForBulkOps1 = {
  ...defaultRuleForBulkDelete,
  attributes: {
    ...defaultRuleForBulkDelete.attributes,
    consumer: AlertConsumers.SIEM,
  },
  id: 'siem-id1',
};

export const siemRule2 = {
  ...siemRule1,
  id: 'siem-id2',
};

export const siemRuleForBulkOps2 = {
  ...siemRuleForBulkOps1,
  id: 'siem-id2',
};

export const enabledRule1 = {
  ...defaultRule,
  attributes: {
    ...defaultRule.attributes,
    enabled: true,
    scheduledTaskId: 'id1',
    apiKey: Buffer.from('123:abc').toString('base64'),
    executionStatus: {
      lastExecutionDate: new Date('2019-02-12T21:01:22.000Z'),
      status: 'pending',
    },
    createdAt: new Date('2019-02-12T21:01:22.000Z'),
    updatedAt: new Date('2019-02-12T21:01:22.000Z'),
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
    executionStatus: {
      lastExecutionDate: new Date('2019-02-12T21:01:22.000Z'),
      status: 'pending',
    },
    createdAt: new Date('2019-02-12T21:01:22.000Z'),
    updatedAt: new Date('2019-02-12T21:01:22.000Z'),
  },
};

export const enabledRule3 = {
  ...defaultRule,
  id: 'id3',
  attributes: {
    ...defaultRule.attributes,
    enabled: true,
    scheduledTaskId: 'id3',
    apiKey: Buffer.from('789:ghi').toString('base64'),
    apiKeyCreatedByUser: true,
  },
};

export const enabledRuleForBulkOps1 = {
  ...defaultRuleForBulkDelete,
  attributes: {
    ...defaultRuleForBulkDelete.attributes,
    enabled: true,
    scheduledTaskId: 'id1',
    apiKey: Buffer.from('123:abc').toString('base64'),
  },
};

export const enabledRuleForBulkOps2 = {
  ...defaultRuleForBulkDelete,
  id: 'id2',
  attributes: {
    ...defaultRuleForBulkDelete.attributes,
    enabled: true,
    scheduledTaskId: 'id2',
    apiKey: Buffer.from('321:abc').toString('base64'),
  },
};

export const enabledRuleForBulkOpsWithActions1 = {
  ...defaultRuleForBulkDelete,
  attributes: {
    ...defaultRuleForBulkDelete.attributes,
    enabled: true,
    scheduledTaskId: 'id1',
    apiKey: Buffer.from('123:abc').toString('base64'),
    actions: [
      {
        uuid: '1',
        id: 'system_action:id',
        actionTypeId: '1',
        actionRef: '1',
        params: {
          foo: true,
        },
      },
    ],
  },
  references: [
    {
      id: 'system_action:id',
      name: '1',
      type: 'action',
    },
  ],
};

export const enabledRuleForBulkOpsWithActions2 = {
  ...defaultRuleForBulkDelete,
  id: 'id2',
  attributes: {
    ...defaultRuleForBulkDelete.attributes,
    enabled: true,
    scheduledTaskId: 'id2',
    apiKey: Buffer.from('321:abc').toString('base64'),
    actions: [
      {
        uuid: '2',
        id: 'default_action:id',
        group: 'default',
        actionTypeId: '2',
        actionRef: '2',
        params: {
          foo: true,
        },
      },
    ],
  },
  references: [
    {
      id: 'default_action:id',
      name: '2',
      type: 'action',
    },
  ],
};

export const disabledRuleForBulkOpsWithActions1 = {
  ...defaultRuleForBulkDelete,
  attributes: {
    ...defaultRuleForBulkDelete.attributes,
    enabled: false,
    scheduledTaskId: 'id1',
    apiKey: Buffer.from('123:abc').toString('base64'),
    actions: [
      {
        uuid: '1',
        id: 'system_action:id',
        actionTypeId: '1',
        actionRef: '1',
        params: {
          foo: true,
        },
      },
    ],
  },
  references: [
    {
      id: 'system_action:id',
      name: '1',
      type: 'action',
    },
  ],
};

export const disabledRuleForBulkOpsWithActions2 = {
  ...defaultRuleForBulkDelete,
  id: 'id2',
  attributes: {
    ...defaultRuleForBulkDelete.attributes,
    enabled: false,
    scheduledTaskId: 'id2',
    apiKey: Buffer.from('321:abc').toString('base64'),
    actions: [
      {
        uuid: '2',
        id: 'default_action:id',
        group: 'default',
        actionTypeId: '2',
        actionRef: '2',
        params: {
          foo: true,
        },
      },
    ],
  },
  references: [
    {
      id: 'default_action:id',
      name: '2',
      type: 'action',
    },
  ],
};

export const enabledRuleForBulkOps3 = {
  ...defaultRuleForBulkDelete,
  id: 'id3',
  attributes: {
    ...defaultRuleForBulkDelete.attributes,
    enabled: true,
    scheduledTaskId: 'id3',
    apiKey: Buffer.from('789:ghi').toString('base64'),
    apiKeyCreatedByUser: true,
  },
};

export const disabledRule1 = {
  ...defaultRule,
  attributes: {
    ...defaultRule.attributes,
    enabled: false,
    scheduledTaskId: 'id1',
    apiKey: Buffer.from('123:abc').toString('base64'),
    executionStatus: {
      lastExecutionDate: new Date('2019-02-12T21:01:22.000Z'),
      status: 'pending',
    },
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
    executionStatus: {
      lastExecutionDate: new Date('2019-02-12T21:01:22.000Z'),
      status: 'pending',
    },
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

export const disabledRuleForBulkDisable1 = {
  ...defaultRuleForBulkDelete,
  attributes: {
    ...defaultRuleForBulkDelete.attributes,
    enabled: false,
    scheduledTaskId: 'id1',
    apiKey: Buffer.from('123:abc').toString('base64'),
  },
};

export const disabledRuleForBulkDisable2 = {
  ...defaultRuleForBulkDelete,
  id: 'id2',
  attributes: {
    ...defaultRuleForBulkDelete.attributes,
    enabled: false,
    scheduledTaskId: 'id2',
    apiKey: Buffer.from('321:abc').toString('base64'),
  },
};

export const disabledRuleForBulkWithAction1 = {
  ...disabledRuleForBulkDisable1,
  attributes: {
    ...disabledRuleForBulkDisable1.attributes,
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

export const disabledRuleForBulkWithAction2 = {
  ...disabledRuleForBulkDisable2,
  attributes: {
    ...disabledRuleForBulkDisable2.attributes,
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
  consumer: 'fakeConsumer',
  enabled: true,
  id: 'id1',
  name: 'fakeName',
  createdAt: new Date('2019-02-12T21:01:22.000Z'),
  updatedAt: new Date('2019-02-12T21:01:22.000Z'),
  schedule: {
    interval: '5m',
  },
  scheduledTaskId: 'id1',
  snoozeSchedule: [],
  executionStatus: {
    lastExecutionDate: new Date('2019-02-12T21:01:22.000Z'),
    status: 'pending',
  },
};

export const returnedRule2 = {
  actions: [],
  alertTypeId: 'fakeType',
  consumer: 'fakeConsumer',
  enabled: true,
  id: 'id2',
  name: 'fakeName',
  createdAt: new Date('2019-02-12T21:01:22.000Z'),
  updatedAt: new Date('2019-02-12T21:01:22.000Z'),
  schedule: {
    interval: '5m',
  },
  scheduledTaskId: 'id2',
  snoozeSchedule: [],
  executionStatus: {
    lastExecutionDate: new Date('2019-02-12T21:01:22.000Z'),
    status: 'pending',
  },
};

export const returnedRuleForBulkOps1 = {
  actions: [],
  alertTypeId: 'fakeType',
  consumer: 'fakeConsumer',
  enabled: true,
  id: 'id1',
  name: 'fakeName',
  executionStatus: {
    lastExecutionDate: new Date('2019-02-12T21:01:22.000Z'),
    status: 'pending',
  },
  createdAt: new Date('2019-02-12T21:01:22.000Z'),
  updatedAt: new Date('2019-02-12T21:01:22.000Z'),
  schedule: {
    interval: '5m',
  },
  scheduledTaskId: 'id1',
  snoozeSchedule: [],
  systemActions: [],
  tags: ['ups'],
  params: { param: 1 },
  muteAll: false,
  mutedInstanceIds: [],
  revision: 1,
};

export const returnedRuleForBulkOps2 = {
  actions: [],
  alertTypeId: 'fakeType',
  consumer: 'fakeConsumer',
  enabled: true,
  id: 'id2',
  name: 'fakeName',
  executionStatus: {
    lastExecutionDate: new Date('2019-02-12T21:01:22.000Z'),
    status: 'pending',
  },
  createdAt: new Date('2019-02-12T21:01:22.000Z'),
  updatedAt: new Date('2019-02-12T21:01:22.000Z'),
  schedule: {
    interval: '5m',
  },
  scheduledTaskId: 'id2',
  snoozeSchedule: [],
  systemActions: [],
  tags: ['ups'],
  params: { param: 1 },
  muteAll: false,
  mutedInstanceIds: [],
  revision: 1,
};

export const returnedRuleForBulkOps3 = {
  actions: [],
  alertTypeId: 'fakeType',
  apiKeyCreatedByUser: true,
  consumer: 'fakeConsumer',
  enabled: true,
  id: 'id3',
  name: 'fakeName',
  executionStatus: {
    lastExecutionDate: new Date('2019-02-12T21:01:22.000Z'),
    status: 'pending',
  },
  createdAt: new Date('2019-02-12T21:01:22.000Z'),
  updatedAt: new Date('2019-02-12T21:01:22.000Z'),
  schedule: {
    interval: '5m',
  },
  scheduledTaskId: 'id3',
  snoozeSchedule: [],
  systemActions: [],
  tags: ['ups'],
  params: { param: 1 },
  muteAll: false,
  mutedInstanceIds: [],
  revision: 1,
};

export const returnedRuleForBulkDisable1 = {
  ...returnedRuleForBulkOps1,
  enabled: false,
};

export const returnedRuleForBulkDisable2 = {
  ...returnedRuleForBulkOps2,
  enabled: false,
};

export const returnedRuleForBulkDisableWithActions1 = {
  ...returnedRuleForBulkDisable1,
  systemActions: [
    {
      actionTypeId: '1',
      id: 'system_action:id',
      params: {
        foo: true,
      },
      uuid: '1',
    },
  ],
};

export const returnedRuleForBulkDisableWithActions2 = {
  ...returnedRuleForBulkDisable2,
  actions: [
    {
      actionTypeId: '2',
      group: 'default',
      id: 'default_action:id',
      params: {
        foo: true,
      },
      uuid: '2',
    },
  ],
};

export const returnedRuleForBulkEnableWithActions1 = {
  ...returnedRuleForBulkOps1,
  systemActions: [
    {
      actionTypeId: '1',
      id: 'system_action:id',
      params: {
        foo: true,
      },
      uuid: '1',
    },
  ],
};

export const returnedRuleForBulkEnableWithActions2 = {
  ...returnedRuleForBulkOps2,
  actions: [
    {
      actionTypeId: '2',
      group: 'default',
      id: 'default_action:id',
      params: {
        foo: true,
      },
      uuid: '2',
    },
  ],
};

export const returnedDisabledRule1 = {
  ...returnedRule1,
  enabled: false,
};

export const returnedDisabledRule2 = {
  ...returnedRule2,
  enabled: false,
};
