/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleAction } from '@kbn/alerting-plugin/common';
import type { ResponseAction, RuleResponseAction } from './rule_response_actions/schemas';
import type { RuleAlertAction } from './types';

export const transformRuleToAlertAction = ({
  group,
  id,
  action_type_id, // eslint-disable-line @typescript-eslint/naming-convention
  params,
}: RuleAlertAction): RuleAction => ({
  group,
  id,
  params,
  actionTypeId: action_type_id,
});

export const transformAlertToRuleAction = ({
  group,
  id,
  actionTypeId,
  params,
}: RuleAction): RuleAlertAction => ({
  group,
  id,
  params,
  action_type_id: actionTypeId,
});

export const transformRuleToAlertResponseAction = ({
  action_type_id: actionTypeId,
  params,
}: ResponseAction): RuleResponseAction => {
  return {
    params,
    actionTypeId,
  };
};

export const transformAlertToRuleResponseAction = ({
  actionTypeId,
  params,
}: RuleResponseAction): ResponseAction => {
  return {
    params,
    action_type_id: actionTypeId,
  };
};
