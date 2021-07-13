/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AlertInstanceContext, AlertTypeParams, AlertTypeState } from '../../../alerting/common';
import {
  PRODUCER,
  RULE_CATEGORY,
  RULE_ID,
  RULE_NAME,
  RULE_UUID,
  TAGS,
} from '../../common/technical_rule_data_field_names';
import { AlertTypeExecutor, AlertTypeWithExecutor } from '../types';
import { LifecycleAlertService, WrappedStateRt } from './create_lifecycle_rule_type_factory';

export interface RuleExecutorData {
  [RULE_CATEGORY]: string;
  [RULE_ID]: string;
  [RULE_UUID]: string;
  [RULE_NAME]: string;
  [PRODUCER]: string;
  [TAGS]: string[];
}

export function getRuleExecutorData<
  TState extends AlertTypeState,
  TParams extends AlertTypeParams,
  TAlertInstanceContext extends AlertInstanceContext,
  TServices extends { alertWithLifecycle: LifecycleAlertService<TAlertInstanceContext> }
>(
  type: AlertTypeWithExecutor<TState, TParams, TAlertInstanceContext, TServices>,
  options: Parameters<
    AlertTypeExecutor<WrappedStateRt<TState>, TParams, TAlertInstanceContext, TServices>
  >[0]
) {
  return {
    [RULE_ID]: type.id,
    [RULE_UUID]: options.alertId,
    [RULE_CATEGORY]: type.name,
    [RULE_NAME]: options.name,
    [TAGS]: options.tags,
    [PRODUCER]: type.producer,
  };
}
