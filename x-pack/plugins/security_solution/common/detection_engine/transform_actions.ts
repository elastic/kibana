/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RuleAction } from '../../../alerting/common';
import { RuleAlertAction } from './types';

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
