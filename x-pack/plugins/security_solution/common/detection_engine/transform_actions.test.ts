/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  transformRuleToAlertAction,
  transformAlertToRuleAction,
  transformRuleToAlertResponseAction,
  transformAlertToRuleResponseAction,
} from './transform_actions';
import { RESPONSE_ACTION_TYPES } from './rule_response_actions/schemas';

describe('transform_actions', () => {
  test('it should transform RuleAlertAction[] to RuleAction[]', () => {
    const ruleAction = {
      id: 'id',
      group: 'group',
      action_type_id: 'action_type_id',
      params: {},
    };
    const alertAction = transformRuleToAlertAction(ruleAction);
    expect(alertAction).toEqual({
      id: ruleAction.id,
      group: ruleAction.group,
      actionTypeId: ruleAction.action_type_id,
      params: ruleAction.params,
    });
  });

  test('it should transform RuleAction[] to RuleAlertAction[]', () => {
    const alertAction = {
      id: 'id',
      group: 'group',
      actionTypeId: 'actionTypeId',
      params: {},
    };
    const ruleAction = transformAlertToRuleAction(alertAction);
    expect(ruleAction).toEqual({
      id: alertAction.id,
      group: alertAction.group,
      action_type_id: alertAction.actionTypeId,
      params: alertAction.params,
    });
  });
  test('it should transform ResponseAction[] to RuleResponseAction[]', () => {
    const ruleAction = {
      action_type_id: RESPONSE_ACTION_TYPES.OSQUERY,
      params: {
        id: 'test',
        ecs_mapping: {},
        saved_query_id: undefined,
        pack_id: undefined,
        query: undefined,
        queries: undefined,
      },
    };
    const alertAction = transformRuleToAlertResponseAction(ruleAction);
    expect(alertAction).toEqual({
      actionTypeId: ruleAction.action_type_id,
      params: {
        id: 'test',
        ecsMapping: {},
        savedQueryId: undefined,
        packId: undefined,
        query: undefined,
        queries: undefined,
      },
    });
  });

  test('it should transform RuleResponseAction[] to ResponseAction[]', () => {
    const alertAction = {
      actionTypeId: RESPONSE_ACTION_TYPES.OSQUERY,
      params: {
        id: 'test',
        ecsMapping: {},
        savedQueryId: undefined,
        packId: undefined,
        query: undefined,
        queries: undefined,
      },
    };
    const ruleAction = transformAlertToRuleResponseAction(alertAction);
    expect(ruleAction).toEqual({
      action_type_id: alertAction.actionTypeId,
      params: {
        id: 'test',
        ecs_mapping: {},
        saved_query_id: undefined,
        pack_id: undefined,
        query: undefined,
        queries: undefined,
      },
    });
  });
});
