/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Logger } from '@kbn/logging';
import { isLeft } from 'fp-ts/lib/Either';
import * as t from 'io-ts';
import { Mutable } from 'utility-types';
import v4 from 'uuid/v4';
import { AlertInstance } from '../../../alerting/server';
import { RuleDataClient } from '..';
import {
  AlertInstanceContext,
  AlertInstanceState,
  AlertTypeParams,
  AlertTypeState,
} from '../../../alerting/common';
import {
  ALERT_DURATION,
  ALERT_END,
  ALERT_ID,
  ALERT_START,
  ALERT_STATUS,
  ALERT_UUID,
  EVENT_ACTION,
  EVENT_KIND,
  RULE_UUID,
  TIMESTAMP,
} from '../../common/technical_rule_data_field_names';
import { AlertTypeExecutor, AlertTypeWithExecutor } from '../types';
import { ParsedTechnicalFields, parseTechnicalFields } from '../../common/parse_technical_fields';
import { createLifecycleExecutor, LifecycleRuleExecutor } from './create_lifecycle_executor';
import { getRuleExecutorData } from './get_rule_executor_data';

export type LifecycleAlertService<TAlertInstanceContext extends Record<string, unknown>> = (alert: {
  id: string;
  fields: Record<string, unknown>;
}) => AlertInstance<AlertInstanceState, TAlertInstanceContext, string>;

const trackedAlertStateRt = t.type({
  alertId: t.string,
  alertUuid: t.string,
  started: t.string,
});

const wrappedStateRt = t.type({
  wrapped: t.record(t.string, t.unknown),
  trackedAlerts: t.record(t.string, trackedAlertStateRt),
});

type CreateLifecycleRuleTypeFactory = (options: {
  ruleDataClient: RuleDataClient;
  logger: Logger;
}) => <
  TParams extends AlertTypeParams,
  TAlertInstanceContext extends AlertInstanceContext,
  TServices extends { alertWithLifecycle: LifecycleAlertService<TAlertInstanceContext> }
>(
  type: AlertTypeWithExecutor<TParams, TAlertInstanceContext, TServices>
) => AlertTypeWithExecutor<TParams, TAlertInstanceContext, any>;

export const createLifecycleRuleTypeFactory = ({
  logger,
  ruleDataClient,
}: {
  ruleDataClient: RuleDataClient;
  logger: Logger;
}) => <
  TParams extends AlertTypeParams,
  TAlertInstanceContext extends AlertInstanceContext,
  TServices extends { alertWithLifecycle: LifecycleAlertService<TAlertInstanceContext> }
>(
  type: AlertTypeWithExecutor<TParams, TAlertInstanceContext, TServices>
): AlertTypeWithExecutor<TParams, TAlertInstanceContext, any> => {
  const createBoundLifecycleExecutor = createLifecycleExecutor(logger, ruleDataClient);
  const executor = createBoundLifecycleExecutor<
    TParams,
    AlertTypeState,
    AlertInstanceState,
    TAlertInstanceContext,
    string
  >(type.executor as any);
  return {
    ...type,
    executor: executor as any,
  };
};
