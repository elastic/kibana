/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RuleActionTypes } from '../../../../../../../common';
import { CreateRuleRequestBodyV1 } from '../../../../../../../common/routes/rule/apis/create';
import { transformCreateBody } from './v1';

describe('transformCreateBody', () => {
  const isSystemAction = (id: string) => id === 'system-action-id';

  const defaultAction: CreateRuleRequestBodyV1['actions'][number] = {
    id: '1',
    uuid: '111',
    params: { foo: 'bar' },
    group: 'my-group',
    actionTypeId: '.test',
    frequency: { notify_when: 'onThrottleInterval' as const, summary: true, throttle: '1h' },
    alerts_filter: {
      query: { dsl: '{test:1}', kql: 'test:1s', filters: [] },
    },
  };

  const systemAction: CreateRuleRequestBodyV1['actions'][number] = {
    id: 'system-action-id',
    uuid: '111',
    params: { foo: 'bar' },
    actionTypeId: '.test',
  };

  const rule: CreateRuleRequestBodyV1<{}> = {
    enabled: true,
    name: 'stressing index-threshold 37/200',
    tags: [],
    params: {},
    rule_type_id: '.index-threshold',
    consumer: 'alerts',
    schedule: {
      interval: '1s',
    },
    actions: [],
    notify_when: 'onActiveAlert' as const,
    throttle: null,
  };

  it('transforms the default action correctly', async () => {
    const res = transformCreateBody({ ...rule, actions: [defaultAction] }, isSystemAction);

    expect(res.actions).toEqual([
      {
        actionTypeId: '.test',
        alertsFilter: { query: { dsl: '{test:1}', filters: [], kql: 'test:1s' } },
        frequency: { notifyWhen: 'onThrottleInterval', summary: true, throttle: '1h' },
        group: 'my-group',
        id: '1',
        params: { foo: 'bar' },
        type: RuleActionTypes.DEFAULT,
        uuid: '111',
      },
    ]);
  });

  it('sets the group to default if it is undefined', async () => {
    const { group, ...defaultActionWithoutGroup } = defaultAction;
    const res = transformCreateBody(
      { ...rule, actions: [defaultActionWithoutGroup] },
      isSystemAction
    );

    expect(res.actions).toEqual([
      {
        actionTypeId: '.test',
        alertsFilter: { query: { dsl: '{test:1}', filters: [], kql: 'test:1s' } },
        frequency: { notifyWhen: 'onThrottleInterval', summary: true, throttle: '1h' },
        group: 'default',
        id: '1',
        params: { foo: 'bar' },
        type: RuleActionTypes.DEFAULT,
        uuid: '111',
      },
    ]);
  });

  it('transforms the system action correctly', async () => {
    const res = transformCreateBody({ ...rule, actions: [systemAction] }, isSystemAction);
    expect(res.actions).toEqual([
      {
        actionTypeId: '.test',
        id: 'system-action-id',
        params: { foo: 'bar' },
        type: RuleActionTypes.SYSTEM,
        uuid: '111',
      },
    ]);
  });
});
