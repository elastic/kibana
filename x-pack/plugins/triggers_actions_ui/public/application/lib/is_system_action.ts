/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RuleAction, RuleActionTypes, RuleSystemAction } from '@kbn/alerting-plugin/common';
import { AsApiContract } from '../../types';

type GetSystemActionType<T> = T extends RuleAction
  ? RuleSystemAction
  : AsApiContract<RuleSystemAction>;

export const isSystemAction = (
  action: RuleAction | AsApiContract<RuleAction>
): action is GetSystemActionType<typeof action> => action.type === RuleActionTypes.SYSTEM;
