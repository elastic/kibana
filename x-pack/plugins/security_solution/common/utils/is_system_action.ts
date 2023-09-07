/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  RuleAction,
  RuleSystemAction,
  SanitizedRuleAction,
} from '@kbn/alerting-plugin/common';
import { RuleActionTypes } from '@kbn/alerting-plugin/common';
import type { NormalizedRuleAction, NormalizedSystemRuleAction } from '../api/detection_engine';
import type { RuleAlertAction, RuleAlertSystemAction } from '../detection_engine/types';

type GetSystemActionType<T> = T extends RuleAction | SanitizedRuleAction
  ? RuleSystemAction
  : T extends RuleAlertAction
  ? RuleAlertSystemAction
  : T extends NormalizedRuleAction
  ? NormalizedSystemRuleAction
  : never;

export const isSystemAction = (
  action: RuleAction | RuleAlertAction | SanitizedRuleAction | NormalizedRuleAction
): action is GetSystemActionType<typeof action> => action.type === RuleActionTypes.SYSTEM;
