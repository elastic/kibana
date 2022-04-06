/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformRuleToAlertAction, transformAlertToRuleAction } from './transform_actions';

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
});
