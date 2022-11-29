/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SanitizedRule, RuleTypeParams } from '../types';
import { parseDuration } from '../../common/parse_duration';
import { RulesClientContext } from './types';

import { clone, CloneArguments } from './clone';
import { create, CreateOptions } from './create';
import { get, GetParams } from './get';
import { resolve, ResolveParams } from './resolve';
import { getAlertState, GetAlertStateParams } from './get_alert_state';
import { getAlertSummary, GetAlertSummaryParams } from './get_alert_summary';
import {
  GetExecutionLogByIdParams,
  getExecutionLogForRule,
  GetGlobalExecutionLogParams,
  getGlobalExecutionLogWithAuth,
} from './get_execution_log';
import {
  getActionErrorLog,
  GetActionErrorLogByIdParams,
  getActionErrorLogWithAuth,
} from './get_action_error_log';
import {
  getGlobalExecutionKpiWithAuth,
  getRuleExecutionKPI,
  GetRuleExecutionKPIParams,
} from './get_execution_kpi';
import { find, FindParams } from './find';
import { aggregate, AggregateOptions } from './aggregate';
import { deleteRule } from './delete';
import { update, UpdateOptions } from './update';
import { bulkDeleteRules } from './bulk_delete';
import { BulkOptions, MuteOptions } from './types';
import { bulkEdit, BulkEditOptions } from './bulk_edit';
import { bulkEnableRules } from './bulk_enable';
import { bulkDisableRules } from './bulk_disable';
import { updateApiKey } from './update_api_key';
import { enable } from './enable';
import { disable } from './disable';
import { snooze, SnoozeParams } from './snooze';
import { unsnooze, UnsnoozeParams } from './unsnooze';
import { clearExpiredSnoozes } from './clear_expired_snoozes';
import { muteAll } from './mute_all';
import { unmuteAll } from './unmute_all';
import { muteInstance } from './mute_instance';
import { unmuteInstance } from './unmute_instance';
import { runSoon } from './run_soon';
import { listAlertTypes } from './list_alert_types';

export type ConstructorOptions = Omit<
  RulesClientContext,
  'fieldsToExcludeFromPublicApi' | 'minimumScheduleIntervalInMs'
>;

const fieldsToExcludeFromPublicApi: Array<keyof SanitizedRule> = [
  'monitoring',
  'mapped_params',
  'snoozeSchedule',
  'activeSnoozes',
];

export class RulesClient {
  private readonly context: RulesClientContext;

  constructor(context: ConstructorOptions) {
    this.context = {
      ...context,
      minimumScheduleIntervalInMs: parseDuration(context.minimumScheduleInterval.value),
      fieldsToExcludeFromPublicApi,
    };
  }

  public aggregate = (params: { options?: AggregateOptions }) => aggregate(this.context, params);
  public clone = (...args: CloneArguments) => clone(this.context, ...args);
  public create = (params: CreateOptions<RuleTypeParams>) => create(this.context, params);
  public delete = (params: { id: string }) => deleteRule(this.context, params);
  public find = (params: FindParams) => find(this.context, params);
  public get = (params: GetParams) => get(this.context, params);
  public resolve = (params: ResolveParams) => resolve(this.context, params);
  public update = (params: UpdateOptions<RuleTypeParams>) => update(this.context, params);

  public getAlertState = (params: GetAlertStateParams) => getAlertState(this.context, params);
  public getAlertSummary = (params: GetAlertSummaryParams) => getAlertSummary(this.context, params);
  public getExecutionLogForRule = (params: GetExecutionLogByIdParams) =>
    getExecutionLogForRule(this.context, params);
  public getGlobalExecutionLogWithAuth = (params: GetGlobalExecutionLogParams) =>
    getGlobalExecutionLogWithAuth(this.context, params);
  public getRuleExecutionKPI = (params: GetRuleExecutionKPIParams) =>
    getRuleExecutionKPI(this.context, params);
  public getGlobalExecutionKpiWithAuth = (params: GetRuleExecutionKPIParams) =>
    getGlobalExecutionKpiWithAuth(this.context, params);
  public getActionErrorLog = (params: GetActionErrorLogByIdParams) =>
    getActionErrorLog(this.context, params);
  public getActionErrorLogWithAuth = (params: GetActionErrorLogByIdParams) =>
    getActionErrorLogWithAuth(this.context, params);

  public bulkDeleteRules = (options: BulkOptions) => bulkDeleteRules(this.context, options);
  public bulkEdit = (options: BulkEditOptions<RuleTypeParams>) => bulkEdit(this.context, options);
  public bulkEnableRules = (options: BulkOptions) => bulkEnableRules(this.context, options);
  public bulkDisableRules = (options: BulkOptions) => bulkDisableRules(this.context, options);

  public updateApiKey = (options: { id: string }) => updateApiKey(this.context, options);

  public enable = (options: { id: string }) => enable(this.context, options);
  public disable = (options: { id: string }) => disable(this.context, options);

  public snooze = (options: SnoozeParams) => snooze(this.context, options);
  public unsnooze = (options: UnsnoozeParams) => unsnooze(this.context, options);

  public clearExpiredSnoozes = (options: { id: string }) =>
    clearExpiredSnoozes(this.context, options);

  public muteAll = (options: { id: string }) => muteAll(this.context, options);
  public unmuteAll = (options: { id: string }) => unmuteAll(this.context, options);
  public muteInstance = (options: MuteOptions) => muteInstance(this.context, options);
  public unmuteInstance = (options: MuteOptions) => unmuteInstance(this.context, options);

  public runSoon = (options: { id: string }) => runSoon(this.context, options);

  public listAlertTypes = () => listAlertTypes(this.context);

  public getSpaceId(): string | undefined {
    return this.context.spaceId;
  }
}
