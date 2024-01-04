/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  transformRuleToAlertAction,
  transformAlertToRuleAction,
  transformNormalizedRuleToAlertAction,
  transformAlertToNormalizedRuleAction,
  transformRuleToAlertResponseAction,
  transformAlertToRuleResponseAction,
} from './transform_actions';
import type {
  ResponseAction,
  RuleResponseAction,
} from '../api/detection_engine/model/rule_response_actions';
import { ResponseActionTypesEnum } from '../api/detection_engine/model/rule_response_actions';
import type { NormalizedRuleAction } from '../api/detection_engine/rule_management';
import type { RuleAction } from '@kbn/alerting-plugin/common';

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
      uuid: '111',
    };
    const ruleAction = transformAlertToRuleAction(alertAction);
    expect(ruleAction).toEqual({
      id: alertAction.id,
      group: alertAction.group,
      action_type_id: alertAction.actionTypeId,
      params: alertAction.params,
      uuid: '111',
    });
  });
  test('it should transform NormalizedRuleAction[] to NormalizedAlertAction[]', () => {
    const ruleAction: NormalizedRuleAction = {
      id: 'id',
      group: 'group',
      params: {},
      frequency: { summary: true, throttle: null, notifyWhen: 'onActiveAlert' },
      alerts_filter: { query: { kql: '*', filters: [] } },
    };
    const alertAction = transformNormalizedRuleToAlertAction(ruleAction);
    expect(alertAction).toEqual({
      id: ruleAction.id,
      group: ruleAction.group,
      params: ruleAction.params,
      frequency: ruleAction.frequency,
      alertsFilter: ruleAction.alerts_filter,
    });
  });
  test('it should transform RuleAction[] to NormalizedRuleAction[]', () => {
    const alertAction: RuleAction = {
      id: 'id',
      group: 'group',
      actionTypeId: 'actionTypeId',
      params: {},
      uuid: '111',
      frequency: { summary: true, throttle: null, notifyWhen: 'onActiveAlert' },
      alertsFilter: { query: { kql: '*', filters: [] } },
    };
    const ruleAction = transformAlertToNormalizedRuleAction(alertAction);
    expect(ruleAction).toEqual({
      id: alertAction.id,
      group: alertAction.group,
      params: alertAction.params,
      frequency: alertAction.frequency,
      alerts_filter: alertAction.alertsFilter,
    });
  });
  test('it should transform ResponseAction[] to RuleResponseAction[]', () => {
    const ruleAction: ResponseAction = {
      action_type_id: ResponseActionTypesEnum['.osquery'],
      params: {
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
        ecsMapping: {},
        savedQueryId: undefined,
        packId: undefined,
        query: undefined,
        queries: undefined,
      },
    });
  });

  test('it should transform RuleResponseAction[] to ResponseAction[]', () => {
    const alertAction: RuleResponseAction = {
      actionTypeId: ResponseActionTypesEnum['.osquery'],
      params: {
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
        ecs_mapping: {},
        saved_query_id: undefined,
        pack_id: undefined,
        query: undefined,
        queries: undefined,
      },
    });
  });
});
