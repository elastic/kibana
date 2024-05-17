/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseDuration } from '../../common/parse_duration';
import { deleteBackfill } from '../application/backfill/methods/delete';
import { findBackfill } from '../application/backfill/methods/find';
import { FindBackfillParams } from '../application/backfill/methods/find/types';
import { getBackfill } from '../application/backfill/methods/get';
import { scheduleBackfill } from '../application/backfill/methods/schedule';
import { ScheduleBackfillParams } from '../application/backfill/methods/schedule/types';
import { aggregateRules } from '../application/rule/methods/aggregate';
import { AggregateParams } from '../application/rule/methods/aggregate/types';
import {
  BulkDeleteRulesRequestBody,
  bulkDeleteRules,
} from '../application/rule/methods/bulk_delete';
import {
  BulkDisableRulesRequestBody,
  bulkDisableRules,
} from '../application/rule/methods/bulk_disable';
import {
  BulkEditOptions,
  bulkEditRules,
} from '../application/rule/methods/bulk_edit/bulk_edit_rules';
import { BulkEnableRulesParams, bulkEnableRules } from '../application/rule/methods/bulk_enable';
import {
  BulkUntrackBody,
  bulkUntrackAlerts,
} from '../application/rule/methods/bulk_untrack/bulk_untrack_alerts';
import { CloneRuleParams, cloneRule } from '../application/rule/methods/clone';
import { CreateRuleParams, createRule } from '../application/rule/methods/create';
import { DeleteRuleParams, deleteRule } from '../application/rule/methods/delete';
import { FindRulesParams, findRules } from '../application/rule/methods/find';
import { GetRuleParams, getRule } from '../application/rule/methods/get';
import { getScheduleFrequency } from '../application/rule/methods/get_schedule_frequency/get_schedule_frequency';
import { muteInstance } from '../application/rule/methods/mute_alert/mute_instance';
import { MuteAlertParams } from '../application/rule/methods/mute_alert/types';
import { ResolveParams, resolveRule } from '../application/rule/methods/resolve';
import { SnoozeRuleOptions, snoozeRule } from '../application/rule/methods/snooze';
import { RuleTagsParams, getRuleTags } from '../application/rule/methods/tags';
import { UnsnoozeParams, unsnoozeRule } from '../application/rule/methods/unsnooze';
import { UpdateRuleParams, updateRule } from '../application/rule/methods/update';
import { RuleTypeParams, SanitizedRule } from '../types';
import { GetAlertFromRawParams, getAlertFromRaw } from './lib/get_alert_from_raw';
import { clearExpiredSnoozes } from './methods/clear_expired_snoozes';
import { disable } from './methods/disable';
import { enable } from './methods/enable';
import {
  GetActionErrorLogByIdParams,
  getActionErrorLog,
  getActionErrorLogWithAuth,
} from './methods/get_action_error_log';
import { GetAlertStateParams, getAlertState } from './methods/get_alert_state';
import { GetAlertSummaryParams, getAlertSummary } from './methods/get_alert_summary';
import {
  GetGlobalExecutionKPIParams,
  GetRuleExecutionKPIParams,
  getGlobalExecutionKpiWithAuth,
  getRuleExecutionKPI,
} from './methods/get_execution_kpi';
import {
  GetExecutionLogByIdParams,
  GetGlobalExecutionLogParams,
  getExecutionLogForRule,
  getGlobalExecutionLogWithAuth,
} from './methods/get_execution_log';
import { listRuleTypes } from './methods/list_rule_types';
import { muteAll } from './methods/mute_all';
import { runSoon } from './methods/run_soon';
import { unmuteAll } from './methods/unmute_all';
import { unmuteInstance } from './methods/unmute_instance';
import { updateApiKey } from './methods/update_api_key';
import { RulesClientContext } from './types';

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

export const fieldsToExcludeFromRevisionUpdates: ReadonlySet<keyof RuleTypeParams> = new Set([
  'activeSnoozes',
  'alertTypeId',
  'apiKey',
  'apiKeyOwner',
  'apiKeyCreatedByUser',
  'consumer',
  'createdAt',
  'createdBy',
  'enabled',
  'executionStatus',
  'id',
  'isSnoozedUntil',
  'lastRun',
  'monitoring',
  'muteAll',
  'mutedInstanceIds',
  'nextRun',
  'revision',
  'running',
  'snoozeSchedule',
  'systemActions',
  'updatedBy',
  'updatedAt',
]);

export class RulesClient {
  private readonly context: RulesClientContext;

  constructor(context: ConstructorOptions) {
    this.context = {
      ...context,
      minimumScheduleIntervalInMs: parseDuration(context.minimumScheduleInterval.value),
      fieldsToExcludeFromPublicApi,
    };
  }

  public aggregate = <T = Record<string, unknown>>(params: AggregateParams<T>): Promise<T> =>
    aggregateRules<T>(this.context, params);
  public clone = <Params extends RuleTypeParams = never>(params: CloneRuleParams) =>
    cloneRule<Params>(this.context, params);
  public create = <Params extends RuleTypeParams = never>(params: CreateRuleParams<Params>) =>
    createRule<Params>(this.context, params);
  public delete = (params: DeleteRuleParams) => deleteRule(this.context, params);
  public find = <Params extends RuleTypeParams = never>(params?: FindRulesParams) =>
    findRules<Params>(this.context, params);
  public get = <Params extends RuleTypeParams = never>(params: GetRuleParams) =>
    getRule<Params>(this.context, params);
  public resolve = <Params extends RuleTypeParams = never>(params: ResolveParams) =>
    resolveRule<Params>(this.context, params);
  public update = <Params extends RuleTypeParams = never>(params: UpdateRuleParams<Params>) =>
    updateRule<Params>(this.context, params);

  public getAlertState = (params: GetAlertStateParams) => getAlertState(this.context, params);
  public getAlertSummary = (params: GetAlertSummaryParams) => getAlertSummary(this.context, params);
  public getExecutionLogForRule = (params: GetExecutionLogByIdParams) =>
    getExecutionLogForRule(this.context, params);
  public getGlobalExecutionLogWithAuth = (params: GetGlobalExecutionLogParams) =>
    getGlobalExecutionLogWithAuth(this.context, params);
  public getRuleExecutionKPI = (params: GetRuleExecutionKPIParams) =>
    getRuleExecutionKPI(this.context, params);
  public getGlobalExecutionKpiWithAuth = (params: GetGlobalExecutionKPIParams) =>
    getGlobalExecutionKpiWithAuth(this.context, params);
  public getActionErrorLog = (params: GetActionErrorLogByIdParams) =>
    getActionErrorLog(this.context, params);
  public getActionErrorLogWithAuth = (params: GetActionErrorLogByIdParams) =>
    getActionErrorLogWithAuth(this.context, params);

  public bulkDeleteRules = (options: BulkDeleteRulesRequestBody) =>
    bulkDeleteRules(this.context, options);
  public bulkEdit = <Params extends RuleTypeParams>(options: BulkEditOptions<Params>) =>
    bulkEditRules<Params>(this.context, options);
  public bulkEnableRules = (params: BulkEnableRulesParams) => bulkEnableRules(this.context, params);
  public bulkDisableRules = (options: BulkDisableRulesRequestBody) =>
    bulkDisableRules(this.context, options);

  public updateApiKey = (options: { id: string }) => updateApiKey(this.context, options);

  public enable = (options: { id: string }) => enable(this.context, options);
  public disable = (options: { id: string; untrack?: boolean }) => disable(this.context, options);

  public snooze = (options: SnoozeRuleOptions) => snoozeRule(this.context, options);
  public unsnooze = (options: UnsnoozeParams) => unsnoozeRule(this.context, options);

  public clearExpiredSnoozes = (options: {
    rule: Pick<SanitizedRule<RuleTypeParams>, 'id' | 'snoozeSchedule'>;
    version?: string;
  }) => clearExpiredSnoozes(this.context, options);

  public muteAll = (options: { id: string }) => muteAll(this.context, options);
  public unmuteAll = (options: { id: string }) => unmuteAll(this.context, options);
  public muteInstance = (options: MuteAlertParams) => muteInstance(this.context, options);
  public unmuteInstance = (options: MuteAlertParams) => unmuteInstance(this.context, options);

  public bulkUntrackAlerts = (options: BulkUntrackBody) => bulkUntrackAlerts(this.context, options);

  public runSoon = (options: { id: string }) => runSoon(this.context, options);

  public listRuleTypes = () => listRuleTypes(this.context);

  public scheduleBackfill = (params: ScheduleBackfillParams) =>
    scheduleBackfill(this.context, params);

  public getBackfill = (id: string) => getBackfill(this.context, id);

  public findBackfill = (params: FindBackfillParams) => findBackfill(this.context, params);

  public deleteBackfill = (id: string) => deleteBackfill(this.context, id);

  public getSpaceId(): string | undefined {
    return this.context.spaceId;
  }

  public getAuthorization() {
    return this.context.authorization;
  }

  public getAuditLogger() {
    return this.context.auditLogger;
  }

  public getTags = (params: RuleTagsParams) => getRuleTags(this.context, params);

  public getScheduleFrequency = () => getScheduleFrequency(this.context);

  public getAlertFromRaw = (params: GetAlertFromRawParams) =>
    getAlertFromRaw(
      this.context,
      params.id,
      params.ruleTypeId,
      params.rawRule,
      params.references,
      params.includeLegacyId,
      params.excludeFromPublicApi,
      params.includeSnoozeData,
      params.omitGeneratedValues
    );
}
