/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RULE_SAVED_OBJECT_TYPE } from '../../../saved_objects';
import type { SavedObjectReference } from '@kbn/core/server';

import { transformFromLegacyActions } from './transform_legacy_actions';
import { transformToNotifyWhen } from './transform_to_notify_when';
import { LegacyIRuleActionsAttributes } from './types';

jest.mock('./transform_to_notify_when', () => ({
  transformToNotifyWhen: jest.fn(),
}));

const legacyActionsAttr: LegacyIRuleActionsAttributes = {
  actions: [
    {
      group: 'group_1',
      params: {},
      action_type_id: 'action_type_1',
      actionRef: 'action_0',
    },
  ],
  ruleThrottle: '1d',
  alertThrottle: '1d',
};

const references: SavedObjectReference[] = [
  {
    name: 'action_0',
    id: 'action-123',
    type: 'action',
  },
];

describe('transformFromLegacyActions', () => {
  it('should throw error if if references are empty', () => {
    const executor = () => {
      return transformFromLegacyActions(legacyActionsAttr, []);
    };
    expect(executor).toThrow('Connector reference id not found.');
  });
  it('should return empty list of actions if legacy actions do not have correct references', () => {
    const actions = transformFromLegacyActions(legacyActionsAttr, [
      {
        name: 'alert_0',
        id: 'alert-1',
        type: RULE_SAVED_OBJECT_TYPE,
      },
    ]);

    expect(actions).toHaveLength(0);
  });

  it('should return notifyWhen as result of transformToNotifyWhen if it is not null', () => {
    (transformToNotifyWhen as jest.Mock).mockReturnValueOnce('onActiveAlert');
    const actions = transformFromLegacyActions(legacyActionsAttr, references);

    expect(transformToNotifyWhen).toHaveBeenCalledWith('1d');
    expect(actions[0].frequency?.notifyWhen).toBe('onActiveAlert');
  });

  it('should return notifyWhen as onThrottleInterval when transformToNotifyWhen returns null', () => {
    (transformToNotifyWhen as jest.Mock).mockReturnValueOnce(null);
    const actions = transformFromLegacyActions(legacyActionsAttr, references);

    expect(actions[0].frequency?.notifyWhen).toBe('onActiveAlert');
  });

  it('should return transformed legacy actions', () => {
    (transformToNotifyWhen as jest.Mock).mockReturnValue('onThrottleInterval');

    const actions = transformFromLegacyActions(legacyActionsAttr, references);

    expect(actions).toEqual([
      {
        actionRef: 'action_0',
        actionTypeId: 'action_type_1',
        frequency: { notifyWhen: 'onThrottleInterval', summary: true, throttle: '1d' },
        group: 'group_1',
        params: {},
        uuid: expect.any(String),
      },
    ]);
  });
});
