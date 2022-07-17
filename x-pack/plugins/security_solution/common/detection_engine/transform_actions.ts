/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleAction, RuleResponseAction } from '@kbn/alerting-plugin/common';
import type { RuleAlertAction, RuleAlertResponseAction } from './types';

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
  action_type_id, // eslint-disable-line @typescript-eslint/naming-convention
  params,
}: RuleAlertResponseAction): RuleResponseAction => ({
  params,
  actionTypeId: action_type_id,
});

export const transformAlertToRuleResponseAction = ({
  actionTypeId,
  params,
}: RuleResponseAction): RuleAlertResponseAction => ({
  params,
  action_type_id: actionTypeId,
});
