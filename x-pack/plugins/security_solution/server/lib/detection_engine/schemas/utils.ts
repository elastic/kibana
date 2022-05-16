/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  isEqlRule,
  isQueryRule,
  isThreatMatchRule,
  isThresholdRule,
  isMlRule,
} from '../../../../common/detection_engine/utils';

import {
  MachineLearningRuleParams,
  EqlRuleParams,
  QueryRuleParams,
  ThreatRuleParams,
  ThresholdRuleParams,
} from './rule_schemas';

export const isMlRuleParams = (obj: unknown): obj is MachineLearningRuleParams =>
  isMlRule((obj as MachineLearningRuleParams).type);

export const isEqlRuleParams = (obj: unknown): obj is EqlRuleParams =>
  isEqlRule((obj as EqlRuleParams).type);

export const isQueryRuleParams = (obj: unknown): obj is QueryRuleParams =>
  isQueryRule((obj as QueryRuleParams).type);

export const isThreatRuleParams = (obj: unknown): obj is ThreatRuleParams =>
  isThreatMatchRule((obj as ThreatRuleParams).type);

export const isThresholdRuleParams = (obj: unknown): obj is ThresholdRuleParams =>
  isThresholdRule((obj as ThresholdRuleParams).type);

export const hasDataViewInParams = (
  obj: unknown
): obj is EqlRuleParams | QueryRuleParams | ThresholdRuleParams | ThreatRuleParams =>
  isEqlRuleParams(obj) ||
  isQueryRuleParams(obj) ||
  isThreatRuleParams(obj) ||
  isThresholdRuleParams(obj);
