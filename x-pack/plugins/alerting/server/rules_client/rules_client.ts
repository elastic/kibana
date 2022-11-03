/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Semver from 'semver';
import pMap from 'p-map';
import Boom from '@hapi/boom';
import {
  omit,
  isEqual,
  map,
  uniq,
  pick,
  truncate,
  trim,
  mapValues,
  cloneDeep,
  isEmpty,
} from 'lodash';
import { i18n } from '@kbn/i18n';
import { AlertConsumers } from '@kbn/rule-data-utils';
import { KueryNode, nodeBuilder } from '@kbn/es-query';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import {
  Logger,
  SavedObjectsClientContract,
  SavedObjectReference,
  SavedObject,
  PluginInitializerContext,
  SavedObjectsUtils,
  SavedObjectAttributes,
  SavedObjectsBulkUpdateObject,
  SavedObjectsBulkDeleteObject,
  SavedObjectsUpdateResponse,
} from '@kbn/core/server';
import { ActionsClient, ActionsAuthorization } from '@kbn/actions-plugin/server';
import {
  GrantAPIKeyResult as SecurityPluginGrantAPIKeyResult,
  InvalidateAPIKeyResult as SecurityPluginInvalidateAPIKeyResult,
} from '@kbn/security-plugin/server';
import { EncryptedSavedObjectsClient } from '@kbn/encrypted-saved-objects-plugin/server';
import {
  ConcreteTaskInstance,
  TaskManagerStartContract,
  TaskStatus,
} from '@kbn/task-manager-plugin/server';
import {
  IEvent,
  IEventLogClient,
  IEventLogger,
  SAVED_OBJECT_REL_PRIMARY,
} from '@kbn/event-log-plugin/server';
import { AuditLogger } from '@kbn/security-plugin/server';
import {
  Rule,
  PartialRule,
  RawRule,
  RuleTypeRegistry,
  RuleAction,
  IntervalSchedule,
  SanitizedRule,
  RuleTaskState,
  AlertSummary,
  RuleExecutionStatusValues,
  RuleNotifyWhenType,
  RuleTypeParams,
  ResolvedSanitizedRule,
  RuleWithLegacyId,
  SanitizedRuleWithLegacyId,
  PartialRuleWithLegacyId,
  RuleSnooze,
  RuleSnoozeSchedule,
  RawAlertInstance as RawAlert,
} from '../types';
import {
  validateRuleTypeParams,
  ruleExecutionStatusFromRaw,
  getRuleNotifyWhenType,
  validateMutatedRuleTypeParams,
  convertRuleIdsToKueryNode,
  getRuleSnoozeEndTime,
  convertEsSortToEventLogSort,
} from '../lib';
import { taskInstanceToAlertTaskInstance } from '../task_runner/alert_task_instance';
import { RegistryRuleType, UntypedNormalizedRuleType } from '../rule_type_registry';
import {
  AlertingAuthorization,
  WriteOperations,
  ReadOperations,
  AlertingAuthorizationEntity,
  AlertingAuthorizationFilterType,
  AlertingAuthorizationFilterOpts,
} from '../authorization';
import { parseIsoOrRelativeDate } from '../lib/iso_or_relative_date';
import { alertSummaryFromEventLog } from '../lib/alert_summary_from_event_log';
import { parseDuration } from '../../common/parse_duration';
import { retryIfConflicts } from '../lib/retry_if_conflicts';
import { partiallyUpdateAlert } from '../saved_objects';
import { bulkMarkApiKeysForInvalidation } from '../invalidate_pending_api_keys/bulk_mark_api_keys_for_invalidation';
import { ruleAuditEvent, RuleAuditAction } from './audit_events';
import {
  mapSortField,
  validateOperationOnAttributes,
  retryIfBulkEditConflicts,
  retryIfBulkDeleteConflicts,
  retryIfBulkEnableConflicts,
  applyBulkEditOperation,
  buildKueryNodeFilter,
} from './lib';
import { getRuleExecutionStatusPending } from '../lib/rule_execution_status';
import { Alert } from '../alert';
import { EVENT_LOG_ACTIONS } from '../plugin';
import { createAlertEventLogRecordObject } from '../lib/create_alert_event_log_record_object';
import { getDefaultRuleMonitoring } from '../task_runner/task_runner';
import {
  getMappedParams,
  getModifiedField,
  getModifiedSearchFields,
  getModifiedSearch,
  modifyFilterKueryNode,
} from './lib/mapped_params_utils';
import { AlertingRulesConfig } from '../config';
import {
  formatExecutionLogResult,
  formatExecutionKPIResult,
  getExecutionLogAggregation,
  getExecutionKPIAggregation,
} from '../lib/get_execution_log_aggregation';
import { IExecutionLogResult, IExecutionErrorsResult } from '../../common';
import { validateSnoozeStartDate } from '../lib/validate_snooze_date';
import { RuleMutedError } from '../lib/errors/rule_muted';
import { formatExecutionErrorsResult } from '../lib/format_execution_log_errors';
import { getActiveScheduledSnoozes } from '../lib/is_rule_snoozed';
import { isSnoozeExpired } from '../lib';

export interface RegistryAlertTypeWithAuth extends RegistryRuleType {
  authorizedConsumers: string[];
}
type NormalizedAlertAction = Omit<RuleAction, 'actionTypeId'>;
export type CreateAPIKeyResult =
  | { apiKeysEnabled: false }
  | { apiKeysEnabled: true; result: SecurityPluginGrantAPIKeyResult };
export type InvalidateAPIKeyResult =
  | { apiKeysEnabled: false }
  | { apiKeysEnabled: true; result: SecurityPluginInvalidateAPIKeyResult };

export interface RuleAggregation {
  status: {
    buckets: Array<{
      key: string;
      doc_count: number;
    }>;
  };
  muted: {
    buckets: Array<{
      key: number;
      key_as_string: string;
      doc_count: number;
    }>;
  };
  enabled: {
    buckets: Array<{
      key: number;
      key_as_string: string;
      doc_count: number;
    }>;
  };
  snoozed: {
    count: {
      doc_count: number;
    };
  };
  tags: {
    buckets: Array<{
      key: string;
      doc_count: number;
    }>;
  };
}

export interface RuleBulkOperationAggregation {
  alertTypeId: {
    buckets: Array<{
      key: string[];
      doc_count: number;
    }>;
  };
}

export interface ConstructorOptions {
  logger: Logger;
  taskManager: TaskManagerStartContract;
  unsecuredSavedObjectsClient: SavedObjectsClientContract;
  authorization: AlertingAuthorization;
  actionsAuthorization: ActionsAuthorization;
  ruleTypeRegistry: RuleTypeRegistry;
  minimumScheduleInterval: AlertingRulesConfig['minimumScheduleInterval'];
  encryptedSavedObjectsClient: EncryptedSavedObjectsClient;
  spaceId: string;
  namespace?: string;
  getUserName: () => Promise<string | null>;
  createAPIKey: (name: string) => Promise<CreateAPIKeyResult>;
  getActionsClient: () => Promise<ActionsClient>;
  getEventLogClient: () => Promise<IEventLogClient>;
  kibanaVersion: PluginInitializerContext['env']['packageInfo']['version'];
  auditLogger?: AuditLogger;
  eventLogger?: IEventLogger;
}

export interface MuteOptions extends IndexType {
  alertId: string;
  alertInstanceId: string;
}

export interface SnoozeOptions extends IndexType {
  snoozeSchedule: RuleSnoozeSchedule;
}

export interface FindOptions extends IndexType {
  perPage?: number;
  page?: number;
  search?: string;
  defaultSearchOperator?: 'AND' | 'OR';
  searchFields?: string[];
  sortField?: string;
  sortOrder?: estypes.SortOrder;
  hasReference?: {
    type: string;
    id: string;
  };
  fields?: string[];
  filter?: string | KueryNode;
}

export type BulkEditFields = keyof Pick<
  Rule,
  'actions' | 'tags' | 'schedule' | 'throttle' | 'notifyWhen' | 'snoozeSchedule' | 'apiKey'
>;

export type BulkEditOperation =
  | {
      operation: 'add' | 'delete' | 'set';
      field: Extract<BulkEditFields, 'tags'>;
      value: string[];
    }
  | {
      operation: 'add' | 'set';
      field: Extract<BulkEditFields, 'actions'>;
      value: NormalizedAlertAction[];
    }
  | {
      operation: 'set';
      field: Extract<BulkEditFields, 'schedule'>;
      value: Rule['schedule'];
    }
  | {
      operation: 'set';
      field: Extract<BulkEditFields, 'throttle'>;
      value: Rule['throttle'];
    }
  | {
      operation: 'set';
      field: Extract<BulkEditFields, 'notifyWhen'>;
      value: Rule['notifyWhen'];
    }
  | {
      operation: 'set';
      field: Extract<BulkEditFields, 'snoozeSchedule'>;
      value: RuleSnoozeSchedule;
    }
  | {
      operation: 'delete';
      field: Extract<BulkEditFields, 'snoozeSchedule'>;
      value?: string[];
    }
  | {
      operation: 'set';
      field: Extract<BulkEditFields, 'apiKey'>;
      value?: undefined;
    };

type RuleParamsModifier<Params extends RuleTypeParams> = (params: Params) => Promise<Params>;

export interface BulkEditOptionsFilter<Params extends RuleTypeParams> {
  filter?: string | KueryNode;
  operations: BulkEditOperation[];
  paramsModifier?: RuleParamsModifier<Params>;
}

export interface BulkEditOptionsIds<Params extends RuleTypeParams> {
  ids: string[];
  operations: BulkEditOperation[];
  paramsModifier?: RuleParamsModifier<Params>;
}

export type BulkEditOptions<Params extends RuleTypeParams> =
  | BulkEditOptionsFilter<Params>
  | BulkEditOptionsIds<Params>;

export interface BulkCommonOptionsFilter {
  filter?: string | KueryNode;
}

export interface BulkCommonOptionsIds {
  ids?: string[];
}

export type BulkCommonOptions = BulkCommonOptionsFilter | BulkCommonOptionsIds;

export interface BulkEditError {
  message: string;
  rule: {
    id: string;
    name: string;
  };
}

export interface BulkDeleteError {
  message: string;
  status: number;
  rule: {
    id: string;
    name: string;
  };
}

export interface AggregateOptions extends IndexType {
  search?: string;
  defaultSearchOperator?: 'AND' | 'OR';
  searchFields?: string[];
  hasReference?: {
    type: string;
    id: string;
  };
  filter?: string | KueryNode;
}

interface IndexType {
  [key: string]: unknown;
}

export interface AggregateResult {
  alertExecutionStatus: { [status: string]: number };
  ruleEnabledStatus?: { enabled: number; disabled: number };
  ruleMutedStatus?: { muted: number; unmuted: number };
  ruleSnoozedStatus?: { snoozed: number };
  ruleTags?: string[];
}

export interface FindResult<Params extends RuleTypeParams> {
  page: number;
  perPage: number;
  total: number;
  data: Array<SanitizedRule<Params>>;
}

export interface CreateOptions<Params extends RuleTypeParams> {
  data: Omit<
    Rule<Params>,
    | 'id'
    | 'createdBy'
    | 'updatedBy'
    | 'createdAt'
    | 'updatedAt'
    | 'apiKey'
    | 'apiKeyOwner'
    | 'muteAll'
    | 'mutedInstanceIds'
    | 'actions'
    | 'executionStatus'
    | 'snoozeSchedule'
    | 'isSnoozedUntil'
  > & { actions: NormalizedAlertAction[] };
  options?: {
    id?: string;
    migrationVersion?: Record<string, string>;
  };
}

export interface UpdateOptions<Params extends RuleTypeParams> {
  id: string;
  data: {
    name: string;
    tags: string[];
    schedule: IntervalSchedule;
    actions: NormalizedAlertAction[];
    params: Params;
    throttle: string | null;
    notifyWhen: RuleNotifyWhenType | null;
  };
}

export interface GetAlertSummaryParams {
  id: string;
  dateStart?: string;
  numberOfExecutions?: number;
}

export interface GetExecutionLogByIdParams {
  id: string;
  dateStart: string;
  dateEnd?: string;
  filter?: string;
  page: number;
  perPage: number;
  sort: estypes.Sort;
}

export interface GetRuleExecutionKPIParams {
  id: string;
  dateStart: string;
  dateEnd?: string;
  filter?: string;
}

export interface GetGlobalExecutionKPIParams {
  dateStart: string;
  dateEnd?: string;
  filter?: string;
}

export interface GetGlobalExecutionLogParams {
  dateStart: string;
  dateEnd?: string;
  filter?: string;
  page: number;
  perPage: number;
  sort: estypes.Sort;
}

export interface GetActionErrorLogByIdParams {
  id: string;
  dateStart: string;
  dateEnd?: string;
  filter?: string;
  page: number;
  perPage: number;
  sort: estypes.Sort;
}

interface ScheduleTaskOptions {
  id: string;
  consumer: string;
  ruleTypeId: string;
  schedule: IntervalSchedule;
  throwOnConflict: boolean; // whether to throw conflict errors or swallow them
}

type BulkAction = 'DELETE' | 'ENABLE';

// NOTE: Changing this prefix will require a migration to update the prefix in all existing `rule` saved objects
const extractedSavedObjectParamReferenceNamePrefix = 'param:';

// NOTE: Changing this prefix will require a migration to update the prefix in all existing `rule` saved objects
const preconfiguredConnectorActionRefPrefix = 'preconfigured:';

const MAX_RULES_NUMBER_FOR_BULK_OPERATION = 10000;
const API_KEY_GENERATE_CONCURRENCY = 50;
const RULE_TYPE_CHECKS_CONCURRENCY = 50;

const alertingAuthorizationFilterOpts: AlertingAuthorizationFilterOpts = {
  type: AlertingAuthorizationFilterType.KQL,
  fieldNames: { ruleTypeId: 'alert.attributes.alertTypeId', consumer: 'alert.attributes.consumer' },
};
export class RulesClient {
  private readonly logger: Logger;
  private readonly getUserName: () => Promise<string | null>;
  private readonly spaceId: string;
  private readonly namespace?: string;
  private readonly taskManager: TaskManagerStartContract;
  private readonly unsecuredSavedObjectsClient: SavedObjectsClientContract;
  private readonly authorization: AlertingAuthorization;
  private readonly ruleTypeRegistry: RuleTypeRegistry;
  private readonly minimumScheduleInterval: AlertingRulesConfig['minimumScheduleInterval'];
  private readonly minimumScheduleIntervalInMs: number;
  private readonly createAPIKey: (name: string) => Promise<CreateAPIKeyResult>;
  private readonly getActionsClient: () => Promise<ActionsClient>;
  private readonly actionsAuthorization: ActionsAuthorization;
  private readonly getEventLogClient: () => Promise<IEventLogClient>;
  private readonly encryptedSavedObjectsClient: EncryptedSavedObjectsClient;
  private readonly kibanaVersion!: PluginInitializerContext['env']['packageInfo']['version'];
  private readonly auditLogger?: AuditLogger;
  private readonly eventLogger?: IEventLogger;
  private readonly fieldsToExcludeFromPublicApi: Array<keyof SanitizedRule> = [
    'monitoring',
    'mapped_params',
    'snoozeSchedule',
    'activeSnoozes',
  ];

  constructor({
    ruleTypeRegistry,
    minimumScheduleInterval,
    unsecuredSavedObjectsClient,
    authorization,
    taskManager,
    logger,
    spaceId,
    namespace,
    getUserName,
    createAPIKey,
    encryptedSavedObjectsClient,
    getActionsClient,
    actionsAuthorization,
    getEventLogClient,
    kibanaVersion,
    auditLogger,
    eventLogger,
  }: ConstructorOptions) {
    this.logger = logger;
    this.getUserName = getUserName;
    this.spaceId = spaceId;
    this.namespace = namespace;
    this.taskManager = taskManager;
    this.ruleTypeRegistry = ruleTypeRegistry;
    this.minimumScheduleInterval = minimumScheduleInterval;
    this.minimumScheduleIntervalInMs = parseDuration(minimumScheduleInterval.value);
    this.unsecuredSavedObjectsClient = unsecuredSavedObjectsClient;
    this.authorization = authorization;
    this.createAPIKey = createAPIKey;
    this.encryptedSavedObjectsClient = encryptedSavedObjectsClient;
    this.getActionsClient = getActionsClient;
    this.actionsAuthorization = actionsAuthorization;
    this.getEventLogClient = getEventLogClient;
    this.kibanaVersion = kibanaVersion;
    this.auditLogger = auditLogger;
    this.eventLogger = eventLogger;
  }

  public async create<Params extends RuleTypeParams = never>({
    data,
    options,
  }: CreateOptions<Params>): Promise<SanitizedRule<Params>> {
    const id = options?.id || SavedObjectsUtils.generateId();

    try {
      await this.authorization.ensureAuthorized({
        ruleTypeId: data.alertTypeId,
        consumer: data.consumer,
        operation: WriteOperations.Create,
        entity: AlertingAuthorizationEntity.Rule,
      });
    } catch (error) {
      this.auditLogger?.log(
        ruleAuditEvent({
          action: RuleAuditAction.CREATE,
          savedObject: { type: 'alert', id },
          error,
        })
      );
      throw error;
    }

    this.ruleTypeRegistry.ensureRuleTypeEnabled(data.alertTypeId);

    // Throws an error if alert type isn't registered
    const ruleType = this.ruleTypeRegistry.get(data.alertTypeId);

    const validatedAlertTypeParams = validateRuleTypeParams(data.params, ruleType.validate?.params);
    const username = await this.getUserName();

    let createdAPIKey = null;
    try {
      createdAPIKey = data.enabled
        ? await this.createAPIKey(this.generateAPIKeyName(ruleType.id, data.name))
        : null;
    } catch (error) {
      throw Boom.badRequest(`Error creating rule: could not create API key - ${error.message}`);
    }

    await this.validateActions(ruleType, data.actions);

    // Throw error if schedule interval is less than the minimum and we are enforcing it
    const intervalInMs = parseDuration(data.schedule.interval);
    if (intervalInMs < this.minimumScheduleIntervalInMs && this.minimumScheduleInterval.enforce) {
      throw Boom.badRequest(
        `Error creating rule: the interval is less than the allowed minimum interval of ${this.minimumScheduleInterval.value}`
      );
    }

    // Extract saved object references for this rule
    const {
      references,
      params: updatedParams,
      actions,
    } = await this.extractReferences(ruleType, data.actions, validatedAlertTypeParams);

    const createTime = Date.now();
    const legacyId = Semver.lt(this.kibanaVersion, '8.0.0') ? id : null;
    const notifyWhen = getRuleNotifyWhenType(data.notifyWhen, data.throttle);

    const rawRule: RawRule = {
      ...data,
      ...this.apiKeyAsAlertAttributes(createdAPIKey, username),
      legacyId,
      actions,
      createdBy: username,
      updatedBy: username,
      createdAt: new Date(createTime).toISOString(),
      updatedAt: new Date(createTime).toISOString(),
      snoozeSchedule: [],
      params: updatedParams as RawRule['params'],
      muteAll: false,
      mutedInstanceIds: [],
      notifyWhen,
      executionStatus: getRuleExecutionStatusPending(new Date().toISOString()),
      monitoring: getDefaultRuleMonitoring(),
    };

    const mappedParams = getMappedParams(updatedParams);

    if (Object.keys(mappedParams).length) {
      rawRule.mapped_params = mappedParams;
    }

    this.auditLogger?.log(
      ruleAuditEvent({
        action: RuleAuditAction.CREATE,
        outcome: 'unknown',
        savedObject: { type: 'alert', id },
      })
    );

    let createdAlert: SavedObject<RawRule>;
    try {
      createdAlert = await this.unsecuredSavedObjectsClient.create(
        'alert',
        this.updateMeta(rawRule),
        {
          ...options,
          references,
          id,
        }
      );
    } catch (e) {
      // Avoid unused API key
      await bulkMarkApiKeysForInvalidation(
        { apiKeys: rawRule.apiKey ? [rawRule.apiKey] : [] },
        this.logger,
        this.unsecuredSavedObjectsClient
      );

      throw e;
    }
    if (data.enabled) {
      let scheduledTask;
      try {
        scheduledTask = await this.scheduleTask({
          id: createdAlert.id,
          consumer: data.consumer,
          ruleTypeId: rawRule.alertTypeId,
          schedule: data.schedule,
          throwOnConflict: true,
        });
      } catch (e) {
        // Cleanup data, something went wrong scheduling the task
        try {
          await this.unsecuredSavedObjectsClient.delete('alert', createdAlert.id);
        } catch (err) {
          // Skip the cleanup error and throw the task manager error to avoid confusion
          this.logger.error(
            `Failed to cleanup alert "${createdAlert.id}" after scheduling task failed. Error: ${err.message}`
          );
        }
        throw e;
      }
      await this.unsecuredSavedObjectsClient.update<RawRule>('alert', createdAlert.id, {
        scheduledTaskId: scheduledTask.id,
      });
      createdAlert.attributes.scheduledTaskId = scheduledTask.id;
    }

    // Log warning if schedule interval is less than the minimum but we're not enforcing it
    if (intervalInMs < this.minimumScheduleIntervalInMs && !this.minimumScheduleInterval.enforce) {
      this.logger.warn(
        `Rule schedule interval (${data.schedule.interval}) for "${createdAlert.attributes.alertTypeId}" rule type with ID "${createdAlert.id}" is less than the minimum value (${this.minimumScheduleInterval.value}). Running rules at this interval may impact alerting performance. Set "xpack.alerting.rules.minimumScheduleInterval.enforce" to true to prevent creation of these rules.`
      );
    }

    return this.getAlertFromRaw<Params>(
      createdAlert.id,
      createdAlert.attributes.alertTypeId,
      createdAlert.attributes,
      references,
      false,
      true
    );
  }

  public async get<Params extends RuleTypeParams = never>({
    id,
    includeLegacyId = false,
    includeSnoozeData = false,
    excludeFromPublicApi = false,
  }: {
    id: string;
    includeLegacyId?: boolean;
    includeSnoozeData?: boolean;
    excludeFromPublicApi?: boolean;
  }): Promise<SanitizedRule<Params> | SanitizedRuleWithLegacyId<Params>> {
    const result = await this.unsecuredSavedObjectsClient.get<RawRule>('alert', id);
    try {
      await this.authorization.ensureAuthorized({
        ruleTypeId: result.attributes.alertTypeId,
        consumer: result.attributes.consumer,
        operation: ReadOperations.Get,
        entity: AlertingAuthorizationEntity.Rule,
      });
    } catch (error) {
      this.auditLogger?.log(
        ruleAuditEvent({
          action: RuleAuditAction.GET,
          savedObject: { type: 'alert', id },
          error,
        })
      );
      throw error;
    }
    this.auditLogger?.log(
      ruleAuditEvent({
        action: RuleAuditAction.GET,
        savedObject: { type: 'alert', id },
      })
    );
    return this.getAlertFromRaw<Params>(
      result.id,
      result.attributes.alertTypeId,
      result.attributes,
      result.references,
      includeLegacyId,
      excludeFromPublicApi,
      includeSnoozeData
    );
  }

  public async resolve<Params extends RuleTypeParams = never>({
    id,
    includeLegacyId,
    includeSnoozeData = false,
  }: {
    id: string;
    includeLegacyId?: boolean;
    includeSnoozeData?: boolean;
  }): Promise<ResolvedSanitizedRule<Params>> {
    const { saved_object: result, ...resolveResponse } =
      await this.unsecuredSavedObjectsClient.resolve<RawRule>('alert', id);
    try {
      await this.authorization.ensureAuthorized({
        ruleTypeId: result.attributes.alertTypeId,
        consumer: result.attributes.consumer,
        operation: ReadOperations.Get,
        entity: AlertingAuthorizationEntity.Rule,
      });
    } catch (error) {
      this.auditLogger?.log(
        ruleAuditEvent({
          action: RuleAuditAction.RESOLVE,
          savedObject: { type: 'alert', id },
          error,
        })
      );
      throw error;
    }
    this.auditLogger?.log(
      ruleAuditEvent({
        action: RuleAuditAction.RESOLVE,
        savedObject: { type: 'alert', id },
      })
    );

    const rule = this.getAlertFromRaw<Params>(
      result.id,
      result.attributes.alertTypeId,
      result.attributes,
      result.references,
      includeLegacyId,
      false,
      includeSnoozeData
    );

    return {
      ...rule,
      ...resolveResponse,
    };
  }

  public async getAlertState({ id }: { id: string }): Promise<RuleTaskState | void> {
    const alert = await this.get({ id });
    await this.authorization.ensureAuthorized({
      ruleTypeId: alert.alertTypeId,
      consumer: alert.consumer,
      operation: ReadOperations.GetRuleState,
      entity: AlertingAuthorizationEntity.Rule,
    });
    if (alert.scheduledTaskId) {
      const { state } = taskInstanceToAlertTaskInstance(
        await this.taskManager.get(alert.scheduledTaskId),
        alert
      );
      return state;
    }
  }

  public async getAlertSummary({
    id,
    dateStart,
    numberOfExecutions,
  }: GetAlertSummaryParams): Promise<AlertSummary> {
    this.logger.debug(`getAlertSummary(): getting alert ${id}`);
    const rule = (await this.get({ id, includeLegacyId: true })) as SanitizedRuleWithLegacyId;

    await this.authorization.ensureAuthorized({
      ruleTypeId: rule.alertTypeId,
      consumer: rule.consumer,
      operation: ReadOperations.GetAlertSummary,
      entity: AlertingAuthorizationEntity.Rule,
    });

    const dateNow = new Date();
    const durationMillis = parseDuration(rule.schedule.interval) * (numberOfExecutions ?? 60);
    const defaultDateStart = new Date(dateNow.valueOf() - durationMillis);
    const parsedDateStart = parseDate(dateStart, 'dateStart', defaultDateStart);

    const eventLogClient = await this.getEventLogClient();

    this.logger.debug(`getAlertSummary(): search the event log for rule ${id}`);
    let events: IEvent[];
    let executionEvents: IEvent[];

    try {
      const [queryResults, executionResults] = await Promise.all([
        eventLogClient.findEventsBySavedObjectIds(
          'alert',
          [id],
          {
            page: 1,
            per_page: 10000,
            start: parsedDateStart.toISOString(),
            sort: [{ sort_field: '@timestamp', sort_order: 'desc' }],
            end: dateNow.toISOString(),
          },
          rule.legacyId !== null ? [rule.legacyId] : undefined
        ),
        eventLogClient.findEventsBySavedObjectIds(
          'alert',
          [id],
          {
            page: 1,
            per_page: numberOfExecutions ?? 60,
            filter: 'event.provider: alerting AND event.action:execute',
            sort: [{ sort_field: '@timestamp', sort_order: 'desc' }],
            end: dateNow.toISOString(),
          },
          rule.legacyId !== null ? [rule.legacyId] : undefined
        ),
      ]);
      events = queryResults.data;
      executionEvents = executionResults.data;
    } catch (err) {
      this.logger.debug(
        `rulesClient.getAlertSummary(): error searching event log for rule ${id}: ${err.message}`
      );
      events = [];
      executionEvents = [];
    }

    return alertSummaryFromEventLog({
      rule,
      events,
      executionEvents,
      dateStart: parsedDateStart.toISOString(),
      dateEnd: dateNow.toISOString(),
    });
  }

  public async getExecutionLogForRule({
    id,
    dateStart,
    dateEnd,
    filter,
    page,
    perPage,
    sort,
  }: GetExecutionLogByIdParams): Promise<IExecutionLogResult> {
    this.logger.debug(`getExecutionLogForRule(): getting execution log for rule ${id}`);
    const rule = (await this.get({ id, includeLegacyId: true })) as SanitizedRuleWithLegacyId;

    try {
      // Make sure user has access to this rule
      await this.authorization.ensureAuthorized({
        ruleTypeId: rule.alertTypeId,
        consumer: rule.consumer,
        operation: ReadOperations.GetExecutionLog,
        entity: AlertingAuthorizationEntity.Rule,
      });
    } catch (error) {
      this.auditLogger?.log(
        ruleAuditEvent({
          action: RuleAuditAction.GET_EXECUTION_LOG,
          savedObject: { type: 'alert', id },
          error,
        })
      );
      throw error;
    }

    this.auditLogger?.log(
      ruleAuditEvent({
        action: RuleAuditAction.GET_EXECUTION_LOG,
        savedObject: { type: 'alert', id },
      })
    );

    // default duration of instance summary is 60 * rule interval
    const dateNow = new Date();
    const parsedDateStart = parseDate(dateStart, 'dateStart', dateNow);
    const parsedDateEnd = parseDate(dateEnd, 'dateEnd', dateNow);

    const eventLogClient = await this.getEventLogClient();

    try {
      const aggResult = await eventLogClient.aggregateEventsBySavedObjectIds(
        'alert',
        [id],
        {
          start: parsedDateStart.toISOString(),
          end: parsedDateEnd.toISOString(),
          aggs: getExecutionLogAggregation({
            filter,
            page,
            perPage,
            sort,
          }),
        },
        rule.legacyId !== null ? [rule.legacyId] : undefined
      );

      return formatExecutionLogResult(aggResult);
    } catch (err) {
      this.logger.debug(
        `rulesClient.getExecutionLogForRule(): error searching event log for rule ${id}: ${err.message}`
      );
      throw err;
    }
  }

  public async getGlobalExecutionLogWithAuth({
    dateStart,
    dateEnd,
    filter,
    page,
    perPage,
    sort,
  }: GetGlobalExecutionLogParams): Promise<IExecutionLogResult> {
    this.logger.debug(`getGlobalExecutionLogWithAuth(): getting global execution log`);

    let authorizationTuple;
    try {
      authorizationTuple = await this.authorization.getFindAuthorizationFilter(
        AlertingAuthorizationEntity.Alert,
        {
          type: AlertingAuthorizationFilterType.KQL,
          fieldNames: {
            ruleTypeId: 'kibana.alert.rule.rule_type_id',
            consumer: 'kibana.alert.rule.consumer',
          },
        }
      );
    } catch (error) {
      this.auditLogger?.log(
        ruleAuditEvent({
          action: RuleAuditAction.GET_GLOBAL_EXECUTION_LOG,
          error,
        })
      );
      throw error;
    }

    this.auditLogger?.log(
      ruleAuditEvent({
        action: RuleAuditAction.GET_GLOBAL_EXECUTION_LOG,
      })
    );

    const dateNow = new Date();
    const parsedDateStart = parseDate(dateStart, 'dateStart', dateNow);
    const parsedDateEnd = parseDate(dateEnd, 'dateEnd', dateNow);

    const eventLogClient = await this.getEventLogClient();

    try {
      const aggResult = await eventLogClient.aggregateEventsWithAuthFilter(
        'alert',
        authorizationTuple.filter as KueryNode,
        {
          start: parsedDateStart.toISOString(),
          end: parsedDateEnd.toISOString(),
          aggs: getExecutionLogAggregation({
            filter,
            page,
            perPage,
            sort,
          }),
        }
      );

      return formatExecutionLogResult(aggResult);
    } catch (err) {
      this.logger.debug(
        `rulesClient.getGlobalExecutionLogWithAuth(): error searching global event log: ${err.message}`
      );
      throw err;
    }
  }

  public async getActionErrorLog({
    id,
    dateStart,
    dateEnd,
    filter,
    page,
    perPage,
    sort,
  }: GetActionErrorLogByIdParams): Promise<IExecutionErrorsResult> {
    this.logger.debug(`getActionErrorLog(): getting action error logs for rule ${id}`);
    const rule = (await this.get({ id, includeLegacyId: true })) as SanitizedRuleWithLegacyId;

    try {
      await this.authorization.ensureAuthorized({
        ruleTypeId: rule.alertTypeId,
        consumer: rule.consumer,
        operation: ReadOperations.GetActionErrorLog,
        entity: AlertingAuthorizationEntity.Rule,
      });
    } catch (error) {
      this.auditLogger?.log(
        ruleAuditEvent({
          action: RuleAuditAction.GET_ACTION_ERROR_LOG,
          savedObject: { type: 'alert', id },
          error,
        })
      );
      throw error;
    }

    this.auditLogger?.log(
      ruleAuditEvent({
        action: RuleAuditAction.GET_ACTION_ERROR_LOG,
        savedObject: { type: 'alert', id },
      })
    );

    const defaultFilter =
      'event.provider:actions AND ((event.action:execute AND (event.outcome:failure OR kibana.alerting.status:warning)) OR (event.action:execute-timeout))';

    // default duration of instance summary is 60 * rule interval
    const dateNow = new Date();
    const parsedDateStart = parseDate(dateStart, 'dateStart', dateNow);
    const parsedDateEnd = parseDate(dateEnd, 'dateEnd', dateNow);

    const eventLogClient = await this.getEventLogClient();

    try {
      const errorResult = await eventLogClient.findEventsBySavedObjectIds(
        'alert',
        [id],
        {
          start: parsedDateStart.toISOString(),
          end: parsedDateEnd.toISOString(),
          page,
          per_page: perPage,
          filter: filter ? `(${defaultFilter}) AND (${filter})` : defaultFilter,
          sort: convertEsSortToEventLogSort(sort),
        },
        rule.legacyId !== null ? [rule.legacyId] : undefined
      );
      return formatExecutionErrorsResult(errorResult);
    } catch (err) {
      this.logger.debug(
        `rulesClient.getActionErrorLog(): error searching event log for rule ${id}: ${err.message}`
      );
      throw err;
    }
  }

  public async getGlobalExecutionKpiWithAuth({
    dateStart,
    dateEnd,
    filter,
  }: GetGlobalExecutionKPIParams) {
    this.logger.debug(`getGlobalExecutionLogWithAuth(): getting global execution log`);

    let authorizationTuple;
    try {
      authorizationTuple = await this.authorization.getFindAuthorizationFilter(
        AlertingAuthorizationEntity.Alert,
        {
          type: AlertingAuthorizationFilterType.KQL,
          fieldNames: {
            ruleTypeId: 'kibana.alert.rule.rule_type_id',
            consumer: 'kibana.alert.rule.consumer',
          },
        }
      );
    } catch (error) {
      this.auditLogger?.log(
        ruleAuditEvent({
          action: RuleAuditAction.GET_GLOBAL_EXECUTION_KPI,
          error,
        })
      );
      throw error;
    }

    this.auditLogger?.log(
      ruleAuditEvent({
        action: RuleAuditAction.GET_GLOBAL_EXECUTION_KPI,
      })
    );

    const dateNow = new Date();
    const parsedDateStart = parseDate(dateStart, 'dateStart', dateNow);
    const parsedDateEnd = parseDate(dateEnd, 'dateEnd', dateNow);

    const eventLogClient = await this.getEventLogClient();

    try {
      const aggResult = await eventLogClient.aggregateEventsWithAuthFilter(
        'alert',
        authorizationTuple.filter as KueryNode,
        {
          start: parsedDateStart.toISOString(),
          end: parsedDateEnd.toISOString(),
          aggs: getExecutionKPIAggregation(filter),
        }
      );

      return formatExecutionKPIResult(aggResult);
    } catch (err) {
      this.logger.debug(
        `rulesClient.getGlobalExecutionKpiWithAuth(): error searching global execution KPI: ${err.message}`
      );
      throw err;
    }
  }

  public async getRuleExecutionKPI({ id, dateStart, dateEnd, filter }: GetRuleExecutionKPIParams) {
    this.logger.debug(`getRuleExecutionKPI(): getting execution KPI for rule ${id}`);
    const rule = (await this.get({ id, includeLegacyId: true })) as SanitizedRuleWithLegacyId;

    try {
      // Make sure user has access to this rule
      await this.authorization.ensureAuthorized({
        ruleTypeId: rule.alertTypeId,
        consumer: rule.consumer,
        operation: ReadOperations.GetRuleExecutionKPI,
        entity: AlertingAuthorizationEntity.Rule,
      });
    } catch (error) {
      this.auditLogger?.log(
        ruleAuditEvent({
          action: RuleAuditAction.GET_RULE_EXECUTION_KPI,
          savedObject: { type: 'alert', id },
          error,
        })
      );
      throw error;
    }

    this.auditLogger?.log(
      ruleAuditEvent({
        action: RuleAuditAction.GET_RULE_EXECUTION_KPI,
        savedObject: { type: 'alert', id },
      })
    );

    // default duration of instance summary is 60 * rule interval
    const dateNow = new Date();
    const parsedDateStart = parseDate(dateStart, 'dateStart', dateNow);
    const parsedDateEnd = parseDate(dateEnd, 'dateEnd', dateNow);

    const eventLogClient = await this.getEventLogClient();

    try {
      const aggResult = await eventLogClient.aggregateEventsBySavedObjectIds(
        'alert',
        [id],
        {
          start: parsedDateStart.toISOString(),
          end: parsedDateEnd.toISOString(),
          aggs: getExecutionKPIAggregation(filter),
        },
        rule.legacyId !== null ? [rule.legacyId] : undefined
      );

      return formatExecutionKPIResult(aggResult);
    } catch (err) {
      this.logger.debug(
        `rulesClient.getRuleExecutionKPI(): error searching execution KPI for rule ${id}: ${err.message}`
      );
      throw err;
    }
  }

  public async find<Params extends RuleTypeParams = never>({
    options: { fields, ...options } = {},
    excludeFromPublicApi = false,
    includeSnoozeData = false,
  }: {
    options?: FindOptions;
    excludeFromPublicApi?: boolean;
    includeSnoozeData?: boolean;
  } = {}): Promise<FindResult<Params>> {
    let authorizationTuple;
    try {
      authorizationTuple = await this.authorization.getFindAuthorizationFilter(
        AlertingAuthorizationEntity.Rule,
        alertingAuthorizationFilterOpts
      );
    } catch (error) {
      this.auditLogger?.log(
        ruleAuditEvent({
          action: RuleAuditAction.FIND,
          error,
        })
      );
      throw error;
    }

    const { filter: authorizationFilter, ensureRuleTypeIsAuthorized } = authorizationTuple;

    const filterKueryNode = buildKueryNodeFilter(options.filter);
    let sortField = mapSortField(options.sortField);
    if (excludeFromPublicApi) {
      try {
        validateOperationOnAttributes(
          filterKueryNode,
          sortField,
          options.searchFields,
          this.fieldsToExcludeFromPublicApi
        );
      } catch (error) {
        throw Boom.badRequest(`Error find rules: ${error.message}`);
      }
    }

    sortField = mapSortField(getModifiedField(options.sortField));

    // Generate new modified search and search fields, translating certain params properties
    // to mapped_params. Thus, allowing for sort/search/filtering on params.
    // We do the modifcation after the validate check to make sure the public API does not
    // use the mapped_params in their queries.
    options = {
      ...options,
      ...(options.searchFields && { searchFields: getModifiedSearchFields(options.searchFields) }),
      ...(options.search && { search: getModifiedSearch(options.searchFields, options.search) }),
    };

    // Modifies kuery node AST to translate params filter and the filter value to mapped_params.
    // This translation is done in place, and therefore is not a pure function.
    if (filterKueryNode) {
      modifyFilterKueryNode({ astFilter: filterKueryNode });
    }

    const {
      page,
      per_page: perPage,
      total,
      saved_objects: data,
    } = await this.unsecuredSavedObjectsClient.find<RawRule>({
      ...options,
      sortField,
      filter:
        (authorizationFilter && filterKueryNode
          ? nodeBuilder.and([filterKueryNode, authorizationFilter as KueryNode])
          : authorizationFilter) ?? filterKueryNode,
      fields: fields ? this.includeFieldsRequiredForAuthentication(fields) : fields,
      type: 'alert',
    });

    const authorizedData = data.map(({ id, attributes, references }) => {
      try {
        ensureRuleTypeIsAuthorized(
          attributes.alertTypeId,
          attributes.consumer,
          AlertingAuthorizationEntity.Rule
        );
      } catch (error) {
        this.auditLogger?.log(
          ruleAuditEvent({
            action: RuleAuditAction.FIND,
            savedObject: { type: 'alert', id },
            error,
          })
        );
        throw error;
      }
      return this.getAlertFromRaw<Params>(
        id,
        attributes.alertTypeId,
        fields ? (pick(attributes, fields) as RawRule) : attributes,
        references,
        false,
        excludeFromPublicApi,
        includeSnoozeData
      );
    });

    authorizedData.forEach(({ id }) =>
      this.auditLogger?.log(
        ruleAuditEvent({
          action: RuleAuditAction.FIND,
          savedObject: { type: 'alert', id },
        })
      )
    );

    return {
      page,
      perPage,
      total,
      data: authorizedData,
    };
  }

  public async aggregate({
    options: { fields, filter, ...options } = {},
  }: { options?: AggregateOptions } = {}): Promise<AggregateResult> {
    let authorizationTuple;
    try {
      authorizationTuple = await this.authorization.getFindAuthorizationFilter(
        AlertingAuthorizationEntity.Rule,
        alertingAuthorizationFilterOpts
      );
    } catch (error) {
      this.auditLogger?.log(
        ruleAuditEvent({
          action: RuleAuditAction.AGGREGATE,
          error,
        })
      );
      throw error;
    }

    const { filter: authorizationFilter } = authorizationTuple;
    const filterKueryNode = buildKueryNodeFilter(filter);

    const resp = await this.unsecuredSavedObjectsClient.find<RawRule, RuleAggregation>({
      ...options,
      filter:
        authorizationFilter && filterKueryNode
          ? nodeBuilder.and([filterKueryNode, authorizationFilter as KueryNode])
          : authorizationFilter,
      page: 1,
      perPage: 0,
      type: 'alert',
      aggs: {
        status: {
          terms: { field: 'alert.attributes.executionStatus.status' },
        },
        enabled: {
          terms: { field: 'alert.attributes.enabled' },
        },
        muted: {
          terms: { field: 'alert.attributes.muteAll' },
        },
        tags: {
          terms: { field: 'alert.attributes.tags', order: { _key: 'asc' } },
        },
        snoozed: {
          nested: {
            path: 'alert.attributes.snoozeSchedule',
          },
          aggs: {
            count: {
              filter: {
                exists: {
                  field: 'alert.attributes.snoozeSchedule.duration',
                },
              },
            },
          },
        },
      },
    });

    if (!resp.aggregations) {
      // Return a placeholder with all zeroes
      const placeholder: AggregateResult = {
        alertExecutionStatus: {},
        ruleEnabledStatus: {
          enabled: 0,
          disabled: 0,
        },
        ruleMutedStatus: {
          muted: 0,
          unmuted: 0,
        },
        ruleSnoozedStatus: { snoozed: 0 },
      };

      for (const key of RuleExecutionStatusValues) {
        placeholder.alertExecutionStatus[key] = 0;
      }

      return placeholder;
    }

    const alertExecutionStatus = resp.aggregations.status.buckets.map(
      ({ key, doc_count: docCount }) => ({
        [key]: docCount,
      })
    );

    const ret: AggregateResult = {
      alertExecutionStatus: alertExecutionStatus.reduce(
        (acc, curr: { [status: string]: number }) => Object.assign(acc, curr),
        {}
      ),
    };

    // Fill missing keys with zeroes
    for (const key of RuleExecutionStatusValues) {
      if (!ret.alertExecutionStatus.hasOwnProperty(key)) {
        ret.alertExecutionStatus[key] = 0;
      }
    }

    const enabledBuckets = resp.aggregations.enabled.buckets;
    ret.ruleEnabledStatus = {
      enabled: enabledBuckets.find((bucket) => bucket.key === 1)?.doc_count ?? 0,
      disabled: enabledBuckets.find((bucket) => bucket.key === 0)?.doc_count ?? 0,
    };

    const mutedBuckets = resp.aggregations.muted.buckets;
    ret.ruleMutedStatus = {
      muted: mutedBuckets.find((bucket) => bucket.key === 1)?.doc_count ?? 0,
      unmuted: mutedBuckets.find((bucket) => bucket.key === 0)?.doc_count ?? 0,
    };

    ret.ruleSnoozedStatus = {
      snoozed: resp.aggregations.snoozed?.count?.doc_count ?? 0,
    };

    const tagsBuckets = resp.aggregations.tags?.buckets || [];
    ret.ruleTags = tagsBuckets.map((bucket) => bucket.key);

    return ret;
  }

  public async delete({ id }: { id: string }) {
    return await retryIfConflicts(
      this.logger,
      `rulesClient.delete('${id}')`,
      async () => await this.deleteWithOCC({ id })
    );
  }

  private async deleteWithOCC({ id }: { id: string }) {
    let taskIdToRemove: string | undefined | null;
    let apiKeyToInvalidate: string | null = null;
    let attributes: RawRule;

    try {
      const decryptedAlert =
        await this.encryptedSavedObjectsClient.getDecryptedAsInternalUser<RawRule>('alert', id, {
          namespace: this.namespace,
        });
      apiKeyToInvalidate = decryptedAlert.attributes.apiKey;
      taskIdToRemove = decryptedAlert.attributes.scheduledTaskId;
      attributes = decryptedAlert.attributes;
    } catch (e) {
      // We'll skip invalidating the API key since we failed to load the decrypted saved object
      this.logger.error(
        `delete(): Failed to load API key to invalidate on alert ${id}: ${e.message}`
      );
      // Still attempt to load the scheduledTaskId using SOC
      const alert = await this.unsecuredSavedObjectsClient.get<RawRule>('alert', id);
      taskIdToRemove = alert.attributes.scheduledTaskId;
      attributes = alert.attributes;
    }

    try {
      await this.authorization.ensureAuthorized({
        ruleTypeId: attributes.alertTypeId,
        consumer: attributes.consumer,
        operation: WriteOperations.Delete,
        entity: AlertingAuthorizationEntity.Rule,
      });
    } catch (error) {
      this.auditLogger?.log(
        ruleAuditEvent({
          action: RuleAuditAction.DELETE,
          savedObject: { type: 'alert', id },
          error,
        })
      );
      throw error;
    }

    this.auditLogger?.log(
      ruleAuditEvent({
        action: RuleAuditAction.DELETE,
        outcome: 'unknown',
        savedObject: { type: 'alert', id },
      })
    );
    const removeResult = await this.unsecuredSavedObjectsClient.delete('alert', id);

    await Promise.all([
      taskIdToRemove ? this.taskManager.removeIfExists(taskIdToRemove) : null,
      apiKeyToInvalidate
        ? bulkMarkApiKeysForInvalidation(
            { apiKeys: [apiKeyToInvalidate] },
            this.logger,
            this.unsecuredSavedObjectsClient
          )
        : null,
    ]);

    return removeResult;
  }

  public async update<Params extends RuleTypeParams = never>({
    id,
    data,
  }: UpdateOptions<Params>): Promise<PartialRule<Params>> {
    return await retryIfConflicts(
      this.logger,
      `rulesClient.update('${id}')`,
      async () => await this.updateWithOCC<Params>({ id, data })
    );
  }

  private async updateWithOCC<Params extends RuleTypeParams>({
    id,
    data,
  }: UpdateOptions<Params>): Promise<PartialRule<Params>> {
    let alertSavedObject: SavedObject<RawRule>;

    try {
      alertSavedObject = await this.encryptedSavedObjectsClient.getDecryptedAsInternalUser<RawRule>(
        'alert',
        id,
        {
          namespace: this.namespace,
        }
      );
    } catch (e) {
      // We'll skip invalidating the API key since we failed to load the decrypted saved object
      this.logger.error(
        `update(): Failed to load API key to invalidate on alert ${id}: ${e.message}`
      );
      // Still attempt to load the object using SOC
      alertSavedObject = await this.unsecuredSavedObjectsClient.get<RawRule>('alert', id);
    }

    try {
      await this.authorization.ensureAuthorized({
        ruleTypeId: alertSavedObject.attributes.alertTypeId,
        consumer: alertSavedObject.attributes.consumer,
        operation: WriteOperations.Update,
        entity: AlertingAuthorizationEntity.Rule,
      });
    } catch (error) {
      this.auditLogger?.log(
        ruleAuditEvent({
          action: RuleAuditAction.UPDATE,
          savedObject: { type: 'alert', id },
          error,
        })
      );
      throw error;
    }

    this.auditLogger?.log(
      ruleAuditEvent({
        action: RuleAuditAction.UPDATE,
        outcome: 'unknown',
        savedObject: { type: 'alert', id },
      })
    );

    this.ruleTypeRegistry.ensureRuleTypeEnabled(alertSavedObject.attributes.alertTypeId);

    const updateResult = await this.updateAlert<Params>({ id, data }, alertSavedObject);

    await Promise.all([
      alertSavedObject.attributes.apiKey
        ? bulkMarkApiKeysForInvalidation(
            { apiKeys: [alertSavedObject.attributes.apiKey] },
            this.logger,
            this.unsecuredSavedObjectsClient
          )
        : null,
      (async () => {
        if (
          updateResult.scheduledTaskId &&
          updateResult.schedule &&
          !isEqual(alertSavedObject.attributes.schedule, updateResult.schedule)
        ) {
          try {
            const { tasks } = await this.taskManager.bulkUpdateSchedules(
              [updateResult.scheduledTaskId],
              updateResult.schedule
            );

            this.logger.debug(
              `Rule update has rescheduled the underlying task: ${updateResult.scheduledTaskId} to run at: ${tasks?.[0]?.runAt}`
            );
          } catch (err) {
            this.logger.error(
              `Rule update failed to run its underlying task. TaskManager bulkUpdateSchedules failed with Error: ${err.message}`
            );
          }
        }
      })(),
    ]);

    return updateResult;
  }

  private async updateAlert<Params extends RuleTypeParams>(
    { id, data }: UpdateOptions<Params>,
    { attributes, version }: SavedObject<RawRule>
  ): Promise<PartialRule<Params>> {
    const ruleType = this.ruleTypeRegistry.get(attributes.alertTypeId);

    // Validate
    const validatedAlertTypeParams = validateRuleTypeParams(data.params, ruleType.validate?.params);
    await this.validateActions(ruleType, data.actions);

    // Throw error if schedule interval is less than the minimum and we are enforcing it
    const intervalInMs = parseDuration(data.schedule.interval);
    if (intervalInMs < this.minimumScheduleIntervalInMs && this.minimumScheduleInterval.enforce) {
      throw Boom.badRequest(
        `Error updating rule: the interval is less than the allowed minimum interval of ${this.minimumScheduleInterval.value}`
      );
    }

    // Extract saved object references for this rule
    const {
      references,
      params: updatedParams,
      actions,
    } = await this.extractReferences(ruleType, data.actions, validatedAlertTypeParams);

    const username = await this.getUserName();

    let createdAPIKey = null;
    try {
      createdAPIKey = attributes.enabled
        ? await this.createAPIKey(this.generateAPIKeyName(ruleType.id, data.name))
        : null;
    } catch (error) {
      throw Boom.badRequest(`Error updating rule: could not create API key - ${error.message}`);
    }

    const apiKeyAttributes = this.apiKeyAsAlertAttributes(createdAPIKey, username);
    const notifyWhen = getRuleNotifyWhenType(data.notifyWhen, data.throttle);

    let updatedObject: SavedObject<RawRule>;
    const createAttributes = this.updateMeta({
      ...attributes,
      ...data,
      ...apiKeyAttributes,
      params: updatedParams as RawRule['params'],
      actions,
      notifyWhen,
      updatedBy: username,
      updatedAt: new Date().toISOString(),
    });

    const mappedParams = getMappedParams(updatedParams);

    if (Object.keys(mappedParams).length) {
      createAttributes.mapped_params = mappedParams;
    }

    try {
      updatedObject = await this.unsecuredSavedObjectsClient.create<RawRule>(
        'alert',
        createAttributes,
        {
          id,
          overwrite: true,
          version,
          references,
        }
      );
    } catch (e) {
      // Avoid unused API key
      await bulkMarkApiKeysForInvalidation(
        { apiKeys: createAttributes.apiKey ? [createAttributes.apiKey] : [] },
        this.logger,
        this.unsecuredSavedObjectsClient
      );

      throw e;
    }

    // Log warning if schedule interval is less than the minimum but we're not enforcing it
    if (intervalInMs < this.minimumScheduleIntervalInMs && !this.minimumScheduleInterval.enforce) {
      this.logger.warn(
        `Rule schedule interval (${data.schedule.interval}) for "${ruleType.id}" rule type with ID "${id}" is less than the minimum value (${this.minimumScheduleInterval.value}). Running rules at this interval may impact alerting performance. Set "xpack.alerting.rules.minimumScheduleInterval.enforce" to true to prevent such changes.`
      );
    }

    return this.getPartialRuleFromRaw(
      id,
      ruleType,
      updatedObject.attributes,
      updatedObject.references,
      false,
      true
    );
  }

  private getAuthorizationFilter = async ({ action }: { action: BulkAction }) => {
    try {
      const authorizationTuple = await this.authorization.getFindAuthorizationFilter(
        AlertingAuthorizationEntity.Rule,
        alertingAuthorizationFilterOpts
      );
      return authorizationTuple.filter;
    } catch (error) {
      this.auditLogger?.log(
        ruleAuditEvent({
          action: RuleAuditAction[action],
          error,
        })
      );
      throw error;
    }
  };

  private getAndValidateCommonBulkOptions = (options: BulkCommonOptions) => {
    const filter = (options as BulkCommonOptionsFilter).filter;
    const ids = (options as BulkCommonOptionsIds).ids;

    if (!ids && !filter) {
      throw Boom.badRequest(
        "Either 'ids' or 'filter' property in method's arguments should be provided"
      );
    }

    if (ids?.length === 0) {
      throw Boom.badRequest("'ids' property should not be an empty array");
    }

    if (ids && filter) {
      throw Boom.badRequest(
        "Both 'filter' and 'ids' are supplied. Define either 'ids' or 'filter' properties in method's arguments"
      );
    }
    return { ids, filter };
  };

  private checkAuthorizationAndGetTotal = async ({
    filter,
    action,
  }: {
    filter: KueryNode | null;
    action: BulkAction;
  }) => {
    const actionToConstantsMapping: Record<
      BulkAction,
      { WriteOperation: WriteOperations | ReadOperations; RuleAuditAction: RuleAuditAction }
    > = {
      DELETE: {
        WriteOperation: WriteOperations.BulkDelete,
        RuleAuditAction: RuleAuditAction.DELETE,
      },
      ENABLE: {
        WriteOperation: WriteOperations.BulkEnable,
        RuleAuditAction: RuleAuditAction.ENABLE,
      },
    };
    const { aggregations, total } = await this.unsecuredSavedObjectsClient.find<
      RawRule,
      RuleBulkOperationAggregation
    >({
      filter,
      page: 1,
      perPage: 0,
      type: 'alert',
      aggs: {
        alertTypeId: {
          multi_terms: {
            terms: [
              { field: 'alert.attributes.alertTypeId' },
              { field: 'alert.attributes.consumer' },
            ],
          },
        },
      },
    });

    if (total > MAX_RULES_NUMBER_FOR_BULK_OPERATION) {
      throw Boom.badRequest(
        `More than ${MAX_RULES_NUMBER_FOR_BULK_OPERATION} rules matched for bulk ${action.toLocaleLowerCase()}`
      );
    }

    const buckets = aggregations?.alertTypeId.buckets;

    if (buckets === undefined || buckets?.length === 0) {
      throw Boom.badRequest(`No rules found for bulk ${action.toLocaleLowerCase()}`);
    }

    await pMap(
      buckets,
      async ({ key: [ruleType, consumer, actions] }) => {
        this.ruleTypeRegistry.ensureRuleTypeEnabled(ruleType);
        try {
          await this.authorization.ensureAuthorized({
            ruleTypeId: ruleType,
            consumer,
            operation: actionToConstantsMapping[action].WriteOperation,
            entity: AlertingAuthorizationEntity.Rule,
          });
        } catch (error) {
          this.auditLogger?.log(
            ruleAuditEvent({
              action: actionToConstantsMapping[action].RuleAuditAction,
              error,
            })
          );
          throw error;
        }
      },
      { concurrency: RULE_TYPE_CHECKS_CONCURRENCY }
    );
    return { total };
  };

  public bulkDeleteRules = async (options: BulkCommonOptions) => {
    const { ids, filter } = this.getAndValidateCommonBulkOptions(options);

    const kueryNodeFilter = ids ? convertRuleIdsToKueryNode(ids) : buildKueryNodeFilter(filter);
    const authorizationFilter = await this.getAuthorizationFilter({ action: 'DELETE' });

    const kueryNodeFilterWithAuth =
      authorizationFilter && kueryNodeFilter
        ? nodeBuilder.and([kueryNodeFilter, authorizationFilter as KueryNode])
        : kueryNodeFilter;

    const { total } = await this.checkAuthorizationAndGetTotal({
      filter: kueryNodeFilterWithAuth,
      action: 'DELETE',
    });

    const { apiKeysToInvalidate, errors, taskIdsToDelete } = await retryIfBulkDeleteConflicts(
      this.logger,
      (filterKueryNode: KueryNode | null) => this.bulkDeleteWithOCC({ filter: filterKueryNode }),
      kueryNodeFilterWithAuth
    );

    const taskIdsFailedToBeDeleted: string[] = [];
    if (taskIdsToDelete.length > 0) {
      try {
        const resultFromDeletingTasks = await this.taskManager.bulkRemoveIfExist(taskIdsToDelete);
        resultFromDeletingTasks?.statuses.forEach((status) => {
          if (!status.success) {
            taskIdsFailedToBeDeleted.push(status.id);
          }
        });
        this.logger.debug(
          `Successfully deleted schedules for underlying tasks: ${taskIdsToDelete
            .filter((id) => taskIdsFailedToBeDeleted.includes(id))
            .join(', ')}`
        );
      } catch (error) {
        this.logger.error(
          `Failure to delete schedules for underlying tasks: ${taskIdsToDelete.join(
            ', '
          )}. TaskManager bulkRemoveIfExist failed with Error: ${error.message}`
        );
      }
    }

    await bulkMarkApiKeysForInvalidation(
      { apiKeys: apiKeysToInvalidate },
      this.logger,
      this.unsecuredSavedObjectsClient
    );

    return { errors, total, taskIdsFailedToBeDeleted };
  };

  private bulkDeleteWithOCC = async ({ filter }: { filter: KueryNode | null }) => {
    const rulesFinder =
      await this.encryptedSavedObjectsClient.createPointInTimeFinderDecryptedAsInternalUser<RawRule>(
        {
          filter,
          type: 'alert',
          perPage: 100,
          ...(this.namespace ? { namespaces: [this.namespace] } : undefined),
        }
      );

    const rules: SavedObjectsBulkDeleteObject[] = [];
    const apiKeysToInvalidate: string[] = [];
    const taskIdsToDelete: string[] = [];
    const errors: BulkDeleteError[] = [];
    const apiKeyToRuleIdMapping: Record<string, string> = {};
    const taskIdToRuleIdMapping: Record<string, string> = {};
    const ruleNameToRuleIdMapping: Record<string, string> = {};

    for await (const response of rulesFinder.find()) {
      for (const rule of response.saved_objects) {
        if (rule.attributes.apiKey) {
          apiKeyToRuleIdMapping[rule.id] = rule.attributes.apiKey;
        }
        if (rule.attributes.name) {
          ruleNameToRuleIdMapping[rule.id] = rule.attributes.name;
        }
        if (rule.attributes.scheduledTaskId) {
          taskIdToRuleIdMapping[rule.id] = rule.attributes.scheduledTaskId;
        }
        rules.push(rule);

        this.auditLogger?.log(
          ruleAuditEvent({
            action: RuleAuditAction.DELETE,
            outcome: 'unknown',
            savedObject: { type: 'alert', id: rule.id },
          })
        );
      }
    }

    const result = await this.unsecuredSavedObjectsClient.bulkDelete(rules);

    result.statuses.forEach((status) => {
      if (status.error === undefined) {
        if (apiKeyToRuleIdMapping[status.id]) {
          apiKeysToInvalidate.push(apiKeyToRuleIdMapping[status.id]);
        }
        if (taskIdToRuleIdMapping[status.id]) {
          taskIdsToDelete.push(taskIdToRuleIdMapping[status.id]);
        }
      } else {
        errors.push({
          message: status.error.message ?? 'n/a',
          status: status.error.statusCode,
          rule: {
            id: status.id,
            name: ruleNameToRuleIdMapping[status.id] ?? 'n/a',
          },
        });
      }
    });
    return { apiKeysToInvalidate, errors, taskIdsToDelete };
  };

  public async bulkEdit<Params extends RuleTypeParams>(
    options: BulkEditOptions<Params>
  ): Promise<{
    rules: Array<SanitizedRule<Params>>;
    errors: BulkEditError[];
    total: number;
  }> {
    const queryFilter = (options as BulkEditOptionsFilter<Params>).filter;
    const ids = (options as BulkEditOptionsIds<Params>).ids;

    if (ids && queryFilter) {
      throw Boom.badRequest(
        "Both 'filter' and 'ids' are supplied. Define either 'ids' or 'filter' properties in method arguments"
      );
    }

    const qNodeQueryFilter = buildKueryNodeFilter(queryFilter);

    const qNodeFilter = ids ? convertRuleIdsToKueryNode(ids) : qNodeQueryFilter;
    let authorizationTuple;
    try {
      authorizationTuple = await this.authorization.getFindAuthorizationFilter(
        AlertingAuthorizationEntity.Rule,
        alertingAuthorizationFilterOpts
      );
    } catch (error) {
      this.auditLogger?.log(
        ruleAuditEvent({
          action: RuleAuditAction.BULK_EDIT,
          error,
        })
      );
      throw error;
    }
    const { filter: authorizationFilter } = authorizationTuple;
    const qNodeFilterWithAuth =
      authorizationFilter && qNodeFilter
        ? nodeBuilder.and([qNodeFilter, authorizationFilter as KueryNode])
        : qNodeFilter;

    const { aggregations, total } = await this.unsecuredSavedObjectsClient.find<
      RawRule,
      RuleBulkOperationAggregation
    >({
      filter: qNodeFilterWithAuth,
      page: 1,
      perPage: 0,
      type: 'alert',
      aggs: {
        alertTypeId: {
          multi_terms: {
            terms: [
              { field: 'alert.attributes.alertTypeId' },
              { field: 'alert.attributes.consumer' },
            ],
          },
        },
      },
    });

    if (total > MAX_RULES_NUMBER_FOR_BULK_OPERATION) {
      throw Boom.badRequest(
        `More than ${MAX_RULES_NUMBER_FOR_BULK_OPERATION} rules matched for bulk edit`
      );
    }
    const buckets = aggregations?.alertTypeId.buckets;

    if (buckets === undefined) {
      throw Error('No rules found for bulk edit');
    }

    await pMap(
      buckets,
      async ({ key: [ruleType, consumer] }) => {
        this.ruleTypeRegistry.ensureRuleTypeEnabled(ruleType);

        try {
          await this.authorization.ensureAuthorized({
            ruleTypeId: ruleType,
            consumer,
            operation: WriteOperations.BulkEdit,
            entity: AlertingAuthorizationEntity.Rule,
          });
        } catch (error) {
          this.auditLogger?.log(
            ruleAuditEvent({
              action: RuleAuditAction.BULK_EDIT,
              error,
            })
          );
          throw error;
        }
      },
      { concurrency: RULE_TYPE_CHECKS_CONCURRENCY }
    );

    const { apiKeysToInvalidate, results, errors } = await retryIfBulkEditConflicts(
      this.logger,
      `rulesClient.update('operations=${JSON.stringify(options.operations)}, paramsModifier=${
        options.paramsModifier ? '[Function]' : undefined
      }')`,
      (filterKueryNode: KueryNode | null) =>
        this.bulkEditOcc({
          filter: filterKueryNode,
          operations: options.operations,
          paramsModifier: options.paramsModifier,
        }),
      qNodeFilterWithAuth
    );

    await bulkMarkApiKeysForInvalidation(
      { apiKeys: apiKeysToInvalidate },
      this.logger,
      this.unsecuredSavedObjectsClient
    );

    const updatedRules = results.map(({ id, attributes, references }) => {
      return this.getAlertFromRaw<Params>(
        id,
        attributes.alertTypeId as string,
        attributes as RawRule,
        references,
        false
      );
    });

    // update schedules only if schedule operation is present
    const scheduleOperation = options.operations.find(
      (
        operation
      ): operation is Extract<BulkEditOperation, { field: Extract<BulkEditFields, 'schedule'> }> =>
        operation.field === 'schedule'
    );

    if (scheduleOperation?.value) {
      const taskIds = updatedRules.reduce<string[]>((acc, rule) => {
        if (rule.scheduledTaskId) {
          acc.push(rule.scheduledTaskId);
        }
        return acc;
      }, []);

      try {
        await this.taskManager.bulkUpdateSchedules(taskIds, scheduleOperation.value);
        this.logger.debug(
          `Successfully updated schedules for underlying tasks: ${taskIds.join(', ')}`
        );
      } catch (error) {
        this.logger.error(
          `Failure to update schedules for underlying tasks: ${taskIds.join(
            ', '
          )}. TaskManager bulkUpdateSchedules failed with Error: ${error.message}`
        );
      }
    }

    return { rules: updatedRules, errors, total };
  }

  private async bulkEditOcc<Params extends RuleTypeParams>({
    filter,
    operations,
    paramsModifier,
  }: {
    filter: KueryNode | null;
    operations: BulkEditOptions<Params>['operations'];
    paramsModifier: BulkEditOptions<Params>['paramsModifier'];
  }): Promise<{
    apiKeysToInvalidate: string[];
    rules: Array<SavedObjectsBulkUpdateObject<RawRule>>;
    resultSavedObjects: Array<SavedObjectsUpdateResponse<RawRule>>;
    errors: BulkEditError[];
  }> {
    const rulesFinder =
      await this.encryptedSavedObjectsClient.createPointInTimeFinderDecryptedAsInternalUser<RawRule>(
        {
          filter,
          type: 'alert',
          perPage: 100,
          ...(this.namespace ? { namespaces: [this.namespace] } : undefined),
        }
      );

    const rules: Array<SavedObjectsBulkUpdateObject<RawRule>> = [];
    const errors: BulkEditError[] = [];
    const apiKeysToInvalidate: string[] = [];
    const apiKeysMap = new Map<string, { oldApiKey?: string; newApiKey?: string }>();
    const username = await this.getUserName();

    for await (const response of rulesFinder.find()) {
      await pMap(
        response.saved_objects,
        async (rule) => {
          try {
            if (rule.attributes.apiKey) {
              apiKeysMap.set(rule.id, { oldApiKey: rule.attributes.apiKey });
            }

            const ruleType = this.ruleTypeRegistry.get(rule.attributes.alertTypeId);

            let attributes = cloneDeep(rule.attributes);
            let ruleActions = {
              actions: this.injectReferencesIntoActions(
                rule.id,
                rule.attributes.actions,
                rule.references || []
              ),
            };

            for (const operation of operations) {
              const { field } = operation;
              if (field === 'snoozeSchedule' || field === 'apiKey') {
                if (rule.attributes.actions.length) {
                  try {
                    await this.actionsAuthorization.ensureAuthorized('execute');
                  } catch (error) {
                    throw Error(`Rule not authorized for bulk ${field} update - ${error.message}`);
                  }
                }
              }
            }

            let hasUpdateApiKeyOperation = false;

            for (const operation of operations) {
              switch (operation.field) {
                case 'actions':
                  await this.validateActions(ruleType, operation.value);
                  ruleActions = applyBulkEditOperation(operation, ruleActions);
                  break;
                case 'snoozeSchedule':
                  // Silently skip adding snooze or snooze schedules on security
                  // rules until we implement snoozing of their rules
                  if (attributes.consumer === AlertConsumers.SIEM) {
                    break;
                  }
                  if (operation.operation === 'set') {
                    const snoozeAttributes = getBulkSnoozeAttributes(attributes, operation.value);
                    try {
                      verifySnoozeScheduleLimit(snoozeAttributes);
                    } catch (error) {
                      throw Error(`Error updating rule: could not add snooze - ${error.message}`);
                    }
                    attributes = {
                      ...attributes,
                      ...snoozeAttributes,
                    };
                  }
                  if (operation.operation === 'delete') {
                    const idsToDelete = operation.value && [...operation.value];
                    if (idsToDelete?.length === 0) {
                      attributes.snoozeSchedule?.forEach((schedule) => {
                        if (schedule.id) {
                          idsToDelete.push(schedule.id);
                        }
                      });
                    }
                    attributes = {
                      ...attributes,
                      ...getBulkUnsnoozeAttributes(attributes, idsToDelete),
                    };
                  }
                  break;
                case 'apiKey': {
                  hasUpdateApiKeyOperation = true;
                  break;
                }
                default:
                  attributes = applyBulkEditOperation(operation, attributes);
              }
            }

            // validate schedule interval
            if (attributes.schedule.interval) {
              const isIntervalInvalid =
                parseDuration(attributes.schedule.interval as string) <
                this.minimumScheduleIntervalInMs;
              if (isIntervalInvalid && this.minimumScheduleInterval.enforce) {
                throw Error(
                  `Error updating rule: the interval is less than the allowed minimum interval of ${this.minimumScheduleInterval.value}`
                );
              } else if (isIntervalInvalid && !this.minimumScheduleInterval.enforce) {
                this.logger.warn(
                  `Rule schedule interval (${attributes.schedule.interval}) for "${ruleType.id}" rule type with ID "${attributes.id}" is less than the minimum value (${this.minimumScheduleInterval.value}). Running rules at this interval may impact alerting performance. Set "xpack.alerting.rules.minimumScheduleInterval.enforce" to true to prevent such changes.`
                );
              }
            }

            const ruleParams = paramsModifier
              ? await paramsModifier(attributes.params as Params)
              : attributes.params;

            // validate rule params
            const validatedAlertTypeParams = validateRuleTypeParams(
              ruleParams,
              ruleType.validate?.params
            );
            const validatedMutatedAlertTypeParams = validateMutatedRuleTypeParams(
              validatedAlertTypeParams,
              rule.attributes.params,
              ruleType.validate?.params
            );

            const {
              actions: rawAlertActions,
              references,
              params: updatedParams,
            } = await this.extractReferences(
              ruleType,
              ruleActions.actions,
              validatedMutatedAlertTypeParams
            );

            const shouldUpdateApiKey = attributes.enabled || hasUpdateApiKeyOperation;

            // create API key
            let createdAPIKey = null;
            try {
              createdAPIKey = shouldUpdateApiKey
                ? await this.createAPIKey(this.generateAPIKeyName(ruleType.id, attributes.name))
                : null;
            } catch (error) {
              throw Error(`Error updating rule: could not create API key - ${error.message}`);
            }

            const apiKeyAttributes = this.apiKeyAsAlertAttributes(createdAPIKey, username);

            // collect generated API keys
            if (apiKeyAttributes.apiKey) {
              apiKeysMap.set(rule.id, {
                ...apiKeysMap.get(rule.id),
                newApiKey: apiKeyAttributes.apiKey,
              });
            }

            // get notifyWhen
            const notifyWhen = getRuleNotifyWhenType(
              attributes.notifyWhen,
              attributes.throttle ?? null
            );

            const updatedAttributes = this.updateMeta({
              ...attributes,
              ...apiKeyAttributes,
              params: updatedParams as RawRule['params'],
              actions: rawAlertActions,
              notifyWhen,
              updatedBy: username,
              updatedAt: new Date().toISOString(),
            });

            // add mapped_params
            const mappedParams = getMappedParams(updatedParams);

            if (Object.keys(mappedParams).length) {
              updatedAttributes.mapped_params = mappedParams;
            }

            rules.push({
              ...rule,
              references,
              attributes: updatedAttributes,
            });
          } catch (error) {
            errors.push({
              message: error.message,
              rule: {
                id: rule.id,
                name: rule.attributes?.name,
              },
            });
            this.auditLogger?.log(
              ruleAuditEvent({
                action: RuleAuditAction.BULK_EDIT,
                error,
              })
            );
          }
        },
        { concurrency: API_KEY_GENERATE_CONCURRENCY }
      );
    }

    let result;
    try {
      result = await this.unsecuredSavedObjectsClient.bulkCreate(rules, { overwrite: true });
    } catch (e) {
      // avoid unused newly generated API keys
      if (apiKeysMap.size > 0) {
        await bulkMarkApiKeysForInvalidation(
          {
            apiKeys: Array.from(apiKeysMap.values()).reduce<string[]>((acc, value) => {
              if (value.newApiKey) {
                acc.push(value.newApiKey);
              }
              return acc;
            }, []),
          },
          this.logger,
          this.unsecuredSavedObjectsClient
        );
      }
      throw e;
    }

    result.saved_objects.map(({ id, error }) => {
      const oldApiKey = apiKeysMap.get(id)?.oldApiKey;
      const newApiKey = apiKeysMap.get(id)?.newApiKey;

      // if SO wasn't saved and has new API key it will be invalidated
      if (error && newApiKey) {
        apiKeysToInvalidate.push(newApiKey);
        // if SO saved and has old Api Key it will be invalidate
      } else if (!error && oldApiKey) {
        apiKeysToInvalidate.push(oldApiKey);
      }
    });

    return { apiKeysToInvalidate, resultSavedObjects: result.saved_objects, errors, rules };
  }

  private getShouldScheduleTask = async (scheduledTaskId: string | null | undefined) => {
    if (!scheduledTaskId) return true;
    try {
      // make sure scheduledTaskId exist
      await this.taskManager.get(scheduledTaskId);
      return false;
    } catch (err) {
      return true;
    }
  };

  public bulkEnableRules = async (options: BulkCommonOptions) => {
    const { ids, filter } = this.getAndValidateCommonBulkOptions(options);

    const kueryNodeFilter = ids ? convertRuleIdsToKueryNode(ids) : buildKueryNodeFilter(filter);
    const authorizationFilter = await this.getAuthorizationFilter({ action: 'ENABLE' });

    const kueryNodeFilterWithAuth =
      authorizationFilter && kueryNodeFilter
        ? nodeBuilder.and([kueryNodeFilter, authorizationFilter as KueryNode])
        : kueryNodeFilter;

    const { total } = await this.checkAuthorizationAndGetTotal({
      filter: kueryNodeFilterWithAuth,
      action: 'ENABLE',
    });

    const { errors, taskIdsToEnable } = await retryIfBulkEnableConflicts(
      this.logger,
      (filterKueryNode: KueryNode | null) =>
        this.bulkEnableRulesWithOCC({ filter: filterKueryNode }),
      kueryNodeFilterWithAuth
    );

    const taskIdsFailedToBeEnabled: string[] = [];
    if (taskIdsToEnable.length > 0) {
      try {
        const resultFromEnablingTasks = await this.taskManager.bulkEnable(taskIdsToEnable);
        resultFromEnablingTasks?.errors?.forEach((error) => {
          taskIdsFailedToBeEnabled.push(error.task.id);
        });
        this.logger.debug(
          `Successfully enabled schedules for underlying tasks: ${taskIdsToEnable
            .filter((id) => !taskIdsFailedToBeEnabled.includes(id))
            .join(', ')}`
        );
      } catch (error) {
        taskIdsFailedToBeEnabled.push(...taskIdsToEnable);
        this.logger.error(
          `Failure to enable schedules for underlying tasks: ${taskIdsToEnable.join(
            ', '
          )}. TaskManager bulkEnable failed with Error: ${error.message}`
        );
      }
    }

    return { errors, total, taskIdsFailedToBeEnabled };
  };

  private bulkEnableRulesWithOCC = async ({ filter }: { filter: KueryNode | null }) => {
    const rulesFinder =
      await this.encryptedSavedObjectsClient.createPointInTimeFinderDecryptedAsInternalUser<RawRule>(
        {
          filter,
          type: 'alert',
          perPage: 100,
          ...(this.namespace ? { namespaces: [this.namespace] } : undefined),
        }
      );

    const rulesToEnable: SavedObjectsBulkUpdateObject[] = [];
    const taskIdsToEnable: string[] = [];
    const errors: BulkDeleteError[] = [];
    const taskIdToRuleIdMapping: Record<string, string> = {};
    const ruleNameToRuleIdMapping: Record<string, string> = {};

    for await (const response of rulesFinder.find()) {
      await pMap(response.saved_objects, async (rule) => {
        if (rule.attributes.actions.length) {
          try {
            await this.actionsAuthorization.ensureAuthorized('execute');
          } catch (error) {
            throw Error(`Rule not authorized for bulk enable - ${error.message}`);
          }
        }
        if (rule.attributes.enabled === true) return; // add some logging
        if (rule.attributes.name) {
          ruleNameToRuleIdMapping[rule.id] = rule.attributes.name;
        }
        if (rule.attributes.scheduledTaskId) {
          taskIdToRuleIdMapping[rule.id] = rule.attributes.scheduledTaskId;
        }

        const username = await this.getUserName();

        const updatedAttributes = this.updateMeta({
          ...rule.attributes,
          ...(!rule.attributes.apiKey &&
            (await this.createNewAPIKeySet({ attributes: rule.attributes, username }))),
          enabled: true,
          updatedBy: username,
          updatedAt: new Date().toISOString(),
          executionStatus: {
            status: 'pending',
            lastDuration: 0,
            lastExecutionDate: new Date().toISOString(),
            error: null,
            warning: null,
          },
        });

        const shouldScheduleTask = await this.getShouldScheduleTask(
          rule.attributes.scheduledTaskId
        );

        let scheduledTaskId;
        if (shouldScheduleTask) {
          const scheduledTask = await this.scheduleTask({
            id: rule.id,
            consumer: rule.attributes.consumer,
            ruleTypeId: rule.attributes.alertTypeId,
            schedule: rule.attributes.schedule as IntervalSchedule,
            throwOnConflict: false,
          });
          scheduledTaskId = scheduledTask.id;
        }

        rulesToEnable.push({
          ...rule,
          attributes: {
            ...updatedAttributes,
            ...(scheduledTaskId ? { scheduledTaskId } : undefined),
          },
        });

        this.auditLogger?.log(
          ruleAuditEvent({
            action: RuleAuditAction.ENABLE,
            outcome: 'unknown',
            savedObject: { type: 'alert', id: rule.id },
          })
        );
      });
    }

    const result = await this.unsecuredSavedObjectsClient.bulkCreate(rulesToEnable, {
      overwrite: true,
    });

    result.saved_objects.forEach((rule) => {
      if (rule.error === undefined) {
        if (taskIdToRuleIdMapping[rule.id]) {
          taskIdsToEnable.push(taskIdToRuleIdMapping[rule.id]);
        }
      } else {
        errors.push({
          message: rule.error.message ?? 'n/a',
          status: rule.error.statusCode,
          rule: {
            id: rule.id,
            name: ruleNameToRuleIdMapping[rule.id] ?? 'n/a',
          },
        });
      }
    });
    return { errors, taskIdsToEnable };
  };

  private apiKeyAsAlertAttributes(
    apiKey: CreateAPIKeyResult | null,
    username: string | null
  ): Pick<RawRule, 'apiKey' | 'apiKeyOwner'> {
    return apiKey && apiKey.apiKeysEnabled
      ? {
          apiKeyOwner: username,
          apiKey: Buffer.from(`${apiKey.result.id}:${apiKey.result.api_key}`).toString('base64'),
        }
      : {
          apiKeyOwner: null,
          apiKey: null,
        };
  }

  public async updateApiKey({ id }: { id: string }): Promise<void> {
    return await retryIfConflicts(
      this.logger,
      `rulesClient.updateApiKey('${id}')`,
      async () => await this.updateApiKeyWithOCC({ id })
    );
  }

  private async updateApiKeyWithOCC({ id }: { id: string }) {
    let apiKeyToInvalidate: string | null = null;
    let attributes: RawRule;
    let version: string | undefined;

    try {
      const decryptedAlert =
        await this.encryptedSavedObjectsClient.getDecryptedAsInternalUser<RawRule>('alert', id, {
          namespace: this.namespace,
        });
      apiKeyToInvalidate = decryptedAlert.attributes.apiKey;
      attributes = decryptedAlert.attributes;
      version = decryptedAlert.version;
    } catch (e) {
      // We'll skip invalidating the API key since we failed to load the decrypted saved object
      this.logger.error(
        `updateApiKey(): Failed to load API key to invalidate on alert ${id}: ${e.message}`
      );
      // Still attempt to load the attributes and version using SOC
      const alert = await this.unsecuredSavedObjectsClient.get<RawRule>('alert', id);
      attributes = alert.attributes;
      version = alert.version;
    }

    try {
      await this.authorization.ensureAuthorized({
        ruleTypeId: attributes.alertTypeId,
        consumer: attributes.consumer,
        operation: WriteOperations.UpdateApiKey,
        entity: AlertingAuthorizationEntity.Rule,
      });
      if (attributes.actions.length) {
        await this.actionsAuthorization.ensureAuthorized('execute');
      }
    } catch (error) {
      this.auditLogger?.log(
        ruleAuditEvent({
          action: RuleAuditAction.UPDATE_API_KEY,
          savedObject: { type: 'alert', id },
          error,
        })
      );
      throw error;
    }

    const username = await this.getUserName();

    let createdAPIKey = null;
    try {
      createdAPIKey = await this.createAPIKey(
        this.generateAPIKeyName(attributes.alertTypeId, attributes.name)
      );
    } catch (error) {
      throw Boom.badRequest(
        `Error updating API key for rule: could not create API key - ${error.message}`
      );
    }

    const updateAttributes = this.updateMeta({
      ...attributes,
      ...this.apiKeyAsAlertAttributes(createdAPIKey, username),
      updatedAt: new Date().toISOString(),
      updatedBy: username,
    });

    this.auditLogger?.log(
      ruleAuditEvent({
        action: RuleAuditAction.UPDATE_API_KEY,
        outcome: 'unknown',
        savedObject: { type: 'alert', id },
      })
    );

    this.ruleTypeRegistry.ensureRuleTypeEnabled(attributes.alertTypeId);

    try {
      await this.unsecuredSavedObjectsClient.update('alert', id, updateAttributes, { version });
    } catch (e) {
      // Avoid unused API key
      await bulkMarkApiKeysForInvalidation(
        { apiKeys: updateAttributes.apiKey ? [updateAttributes.apiKey] : [] },
        this.logger,
        this.unsecuredSavedObjectsClient
      );
      throw e;
    }

    if (apiKeyToInvalidate) {
      await bulkMarkApiKeysForInvalidation(
        { apiKeys: [apiKeyToInvalidate] },
        this.logger,
        this.unsecuredSavedObjectsClient
      );
    }
  }

  public async enable({ id }: { id: string }): Promise<void> {
    return await retryIfConflicts(
      this.logger,
      `rulesClient.enable('${id}')`,
      async () => await this.enableWithOCC({ id })
    );
  }

  private async enableWithOCC({ id }: { id: string }) {
    let existingApiKey: string | null = null;
    let attributes: RawRule;
    let version: string | undefined;

    try {
      const decryptedAlert =
        await this.encryptedSavedObjectsClient.getDecryptedAsInternalUser<RawRule>('alert', id, {
          namespace: this.namespace,
        });
      existingApiKey = decryptedAlert.attributes.apiKey;
      attributes = decryptedAlert.attributes;
      version = decryptedAlert.version;
    } catch (e) {
      this.logger.error(`enable(): Failed to load API key of alert ${id}: ${e.message}`);
      // Still attempt to load the attributes and version using SOC
      const alert = await this.unsecuredSavedObjectsClient.get<RawRule>('alert', id);
      attributes = alert.attributes;
      version = alert.version;
    }

    try {
      await this.authorization.ensureAuthorized({
        ruleTypeId: attributes.alertTypeId,
        consumer: attributes.consumer,
        operation: WriteOperations.Enable,
        entity: AlertingAuthorizationEntity.Rule,
      });

      if (attributes.actions.length) {
        await this.actionsAuthorization.ensureAuthorized('execute');
      }
    } catch (error) {
      this.auditLogger?.log(
        ruleAuditEvent({
          action: RuleAuditAction.ENABLE,
          savedObject: { type: 'alert', id },
          error,
        })
      );
      throw error;
    }

    this.auditLogger?.log(
      ruleAuditEvent({
        action: RuleAuditAction.ENABLE,
        outcome: 'unknown',
        savedObject: { type: 'alert', id },
      })
    );

    this.ruleTypeRegistry.ensureRuleTypeEnabled(attributes.alertTypeId);

    if (attributes.enabled === false) {
      const username = await this.getUserName();

      const updateAttributes = this.updateMeta({
        ...attributes,
        ...(!existingApiKey && (await this.createNewAPIKeySet({ attributes, username }))),
        enabled: true,
        updatedBy: username,
        updatedAt: new Date().toISOString(),
        executionStatus: {
          status: 'pending',
          lastDuration: 0,
          lastExecutionDate: new Date().toISOString(),
          error: null,
          warning: null,
        },
      });

      try {
        await this.unsecuredSavedObjectsClient.update('alert', id, updateAttributes, { version });
      } catch (e) {
        throw e;
      }
    }

    let scheduledTaskIdToCreate: string | null = null;
    if (attributes.scheduledTaskId) {
      // If scheduledTaskId defined in rule SO, make sure it exists
      try {
        await this.taskManager.get(attributes.scheduledTaskId);
      } catch (err) {
        scheduledTaskIdToCreate = id;
      }
    } else {
      // If scheduledTaskId doesn't exist in rule SO, set it to rule ID
      scheduledTaskIdToCreate = id;
    }

    if (scheduledTaskIdToCreate) {
      // Schedule the task if it doesn't exist
      const scheduledTask = await this.scheduleTask({
        id,
        consumer: attributes.consumer,
        ruleTypeId: attributes.alertTypeId,
        schedule: attributes.schedule as IntervalSchedule,
        throwOnConflict: false,
      });
      await this.unsecuredSavedObjectsClient.update('alert', id, {
        scheduledTaskId: scheduledTask.id,
      });
    } else {
      // Task exists so set enabled to true
      await this.taskManager.bulkEnable([attributes.scheduledTaskId!]);
    }
  }

  private async createNewAPIKeySet({
    attributes,
    username,
  }: {
    attributes: RawRule;
    username: string | null;
  }): Promise<Pick<RawRule, 'apiKey' | 'apiKeyOwner'>> {
    let createdAPIKey = null;
    try {
      createdAPIKey = await this.createAPIKey(
        this.generateAPIKeyName(attributes.alertTypeId, attributes.name)
      );
    } catch (error) {
      throw Boom.badRequest(`Error creating API key for rule: ${error.message}`);
    }

    return this.apiKeyAsAlertAttributes(createdAPIKey, username);
  }

  public async disable({ id }: { id: string }): Promise<void> {
    return await retryIfConflicts(
      this.logger,
      `rulesClient.disable('${id}')`,
      async () => await this.disableWithOCC({ id })
    );
  }

  private async disableWithOCC({ id }: { id: string }) {
    let attributes: RawRule;
    let version: string | undefined;

    try {
      const decryptedAlert =
        await this.encryptedSavedObjectsClient.getDecryptedAsInternalUser<RawRule>('alert', id, {
          namespace: this.namespace,
        });
      attributes = decryptedAlert.attributes;
      version = decryptedAlert.version;
    } catch (e) {
      this.logger.error(`disable(): Failed to load API key of alert ${id}: ${e.message}`);
      // Still attempt to load the attributes and version using SOC
      const alert = await this.unsecuredSavedObjectsClient.get<RawRule>('alert', id);
      attributes = alert.attributes;
      version = alert.version;
    }

    if (this.eventLogger && attributes.scheduledTaskId) {
      try {
        const { state } = taskInstanceToAlertTaskInstance(
          await this.taskManager.get(attributes.scheduledTaskId),
          attributes as unknown as SanitizedRule
        );

        const recoveredAlertInstances = mapValues<Record<string, RawAlert>, Alert>(
          state.alertInstances ?? {},
          (rawAlertInstance, alertId) => new Alert(alertId, rawAlertInstance)
        );
        const recoveredAlertInstanceIds = Object.keys(recoveredAlertInstances);

        for (const instanceId of recoveredAlertInstanceIds) {
          const { group: actionGroup } =
            recoveredAlertInstances[instanceId].getLastScheduledActions() ?? {};
          const instanceState = recoveredAlertInstances[instanceId].getState();
          const message = `instance '${instanceId}' has recovered due to the rule was disabled`;

          const event = createAlertEventLogRecordObject({
            ruleId: id,
            ruleName: attributes.name,
            ruleType: this.ruleTypeRegistry.get(attributes.alertTypeId),
            consumer: attributes.consumer,
            instanceId,
            action: EVENT_LOG_ACTIONS.recoveredInstance,
            message,
            state: instanceState,
            group: actionGroup,
            namespace: this.namespace,
            spaceId: this.spaceId,
            savedObjects: [
              {
                id,
                type: 'alert',
                typeId: attributes.alertTypeId,
                relation: SAVED_OBJECT_REL_PRIMARY,
              },
            ],
          });
          this.eventLogger.logEvent(event);
        }
      } catch (error) {
        // this should not block the rest of the disable process
        this.logger.warn(
          `rulesClient.disable('${id}') - Could not write recovery events - ${error.message}`
        );
      }
    }
    try {
      await this.authorization.ensureAuthorized({
        ruleTypeId: attributes.alertTypeId,
        consumer: attributes.consumer,
        operation: WriteOperations.Disable,
        entity: AlertingAuthorizationEntity.Rule,
      });
    } catch (error) {
      this.auditLogger?.log(
        ruleAuditEvent({
          action: RuleAuditAction.DISABLE,
          savedObject: { type: 'alert', id },
          error,
        })
      );
      throw error;
    }

    this.auditLogger?.log(
      ruleAuditEvent({
        action: RuleAuditAction.DISABLE,
        outcome: 'unknown',
        savedObject: { type: 'alert', id },
      })
    );

    this.ruleTypeRegistry.ensureRuleTypeEnabled(attributes.alertTypeId);

    if (attributes.enabled === true) {
      await this.unsecuredSavedObjectsClient.update(
        'alert',
        id,
        this.updateMeta({
          ...attributes,
          enabled: false,
          scheduledTaskId: attributes.scheduledTaskId === id ? attributes.scheduledTaskId : null,
          updatedBy: await this.getUserName(),
          updatedAt: new Date().toISOString(),
        }),
        { version }
      );

      // If the scheduledTaskId does not match the rule id, we should
      // remove the task, otherwise mark the task as disabled
      if (attributes.scheduledTaskId) {
        if (attributes.scheduledTaskId !== id) {
          await this.taskManager.removeIfExists(attributes.scheduledTaskId);
        } else {
          await this.taskManager.bulkDisable([attributes.scheduledTaskId]);
        }
      }
    }
  }

  public async snooze({
    id,
    snoozeSchedule,
  }: {
    id: string;
    snoozeSchedule: RuleSnoozeSchedule;
  }): Promise<void> {
    const snoozeDateValidationMsg = validateSnoozeStartDate(snoozeSchedule.rRule.dtstart);
    if (snoozeDateValidationMsg) {
      throw new RuleMutedError(snoozeDateValidationMsg);
    }

    return await retryIfConflicts(
      this.logger,
      `rulesClient.snooze('${id}', ${JSON.stringify(snoozeSchedule, null, 4)})`,
      async () => await this.snoozeWithOCC({ id, snoozeSchedule })
    );
  }

  private async snoozeWithOCC({
    id,
    snoozeSchedule,
  }: {
    id: string;
    snoozeSchedule: RuleSnoozeSchedule;
  }) {
    const { attributes, version } = await this.unsecuredSavedObjectsClient.get<RawRule>(
      'alert',
      id
    );

    try {
      await this.authorization.ensureAuthorized({
        ruleTypeId: attributes.alertTypeId,
        consumer: attributes.consumer,
        operation: WriteOperations.Snooze,
        entity: AlertingAuthorizationEntity.Rule,
      });

      if (attributes.actions.length) {
        await this.actionsAuthorization.ensureAuthorized('execute');
      }
    } catch (error) {
      this.auditLogger?.log(
        ruleAuditEvent({
          action: RuleAuditAction.SNOOZE,
          savedObject: { type: 'alert', id },
          error,
        })
      );
      throw error;
    }

    this.auditLogger?.log(
      ruleAuditEvent({
        action: RuleAuditAction.SNOOZE,
        outcome: 'unknown',
        savedObject: { type: 'alert', id },
      })
    );

    this.ruleTypeRegistry.ensureRuleTypeEnabled(attributes.alertTypeId);

    const newAttrs = getSnoozeAttributes(attributes, snoozeSchedule);

    try {
      verifySnoozeScheduleLimit(newAttrs);
    } catch (error) {
      throw Boom.badRequest(error.message);
    }

    const updateAttributes = this.updateMeta({
      ...newAttrs,
      updatedBy: await this.getUserName(),
      updatedAt: new Date().toISOString(),
    });
    const updateOptions = { version };

    await partiallyUpdateAlert(
      this.unsecuredSavedObjectsClient,
      id,
      updateAttributes,
      updateOptions
    );
  }

  public async unsnooze({
    id,
    scheduleIds,
  }: {
    id: string;
    scheduleIds?: string[];
  }): Promise<void> {
    return await retryIfConflicts(
      this.logger,
      `rulesClient.unsnooze('${id}')`,
      async () => await this.unsnoozeWithOCC({ id, scheduleIds })
    );
  }

  private async unsnoozeWithOCC({ id, scheduleIds }: { id: string; scheduleIds?: string[] }) {
    const { attributes, version } = await this.unsecuredSavedObjectsClient.get<RawRule>(
      'alert',
      id
    );

    try {
      await this.authorization.ensureAuthorized({
        ruleTypeId: attributes.alertTypeId,
        consumer: attributes.consumer,
        operation: WriteOperations.Unsnooze,
        entity: AlertingAuthorizationEntity.Rule,
      });

      if (attributes.actions.length) {
        await this.actionsAuthorization.ensureAuthorized('execute');
      }
    } catch (error) {
      this.auditLogger?.log(
        ruleAuditEvent({
          action: RuleAuditAction.UNSNOOZE,
          savedObject: { type: 'alert', id },
          error,
        })
      );
      throw error;
    }

    this.auditLogger?.log(
      ruleAuditEvent({
        action: RuleAuditAction.UNSNOOZE,
        outcome: 'unknown',
        savedObject: { type: 'alert', id },
      })
    );

    this.ruleTypeRegistry.ensureRuleTypeEnabled(attributes.alertTypeId);
    const newAttrs = getUnsnoozeAttributes(attributes, scheduleIds);

    const updateAttributes = this.updateMeta({
      ...newAttrs,
      updatedBy: await this.getUserName(),
      updatedAt: new Date().toISOString(),
    });
    const updateOptions = { version };

    await partiallyUpdateAlert(
      this.unsecuredSavedObjectsClient,
      id,
      updateAttributes,
      updateOptions
    );
  }

  public calculateIsSnoozedUntil(rule: {
    muteAll: boolean;
    snoozeSchedule?: RuleSnooze;
  }): string | null {
    const isSnoozedUntil = getRuleSnoozeEndTime(rule);
    return isSnoozedUntil ? isSnoozedUntil.toISOString() : null;
  }

  public async clearExpiredSnoozes({ id }: { id: string }): Promise<void> {
    const { attributes, version } = await this.unsecuredSavedObjectsClient.get<RawRule>(
      'alert',
      id
    );

    const snoozeSchedule = attributes.snoozeSchedule
      ? attributes.snoozeSchedule.filter((s) => {
          try {
            return !isSnoozeExpired(s);
          } catch (e) {
            this.logger.error(`Error checking for expiration of snooze ${s.id}: ${e}`);
            return true;
          }
        })
      : [];

    if (snoozeSchedule.length === attributes.snoozeSchedule?.length) return;

    const updateAttributes = this.updateMeta({
      snoozeSchedule,
      updatedBy: await this.getUserName(),
      updatedAt: new Date().toISOString(),
    });
    const updateOptions = { version };

    await partiallyUpdateAlert(
      this.unsecuredSavedObjectsClient,
      id,
      updateAttributes,
      updateOptions
    );
  }

  public async muteAll({ id }: { id: string }): Promise<void> {
    return await retryIfConflicts(
      this.logger,
      `rulesClient.muteAll('${id}')`,
      async () => await this.muteAllWithOCC({ id })
    );
  }

  private async muteAllWithOCC({ id }: { id: string }) {
    const { attributes, version } = await this.unsecuredSavedObjectsClient.get<RawRule>(
      'alert',
      id
    );

    try {
      await this.authorization.ensureAuthorized({
        ruleTypeId: attributes.alertTypeId,
        consumer: attributes.consumer,
        operation: WriteOperations.MuteAll,
        entity: AlertingAuthorizationEntity.Rule,
      });

      if (attributes.actions.length) {
        await this.actionsAuthorization.ensureAuthorized('execute');
      }
    } catch (error) {
      this.auditLogger?.log(
        ruleAuditEvent({
          action: RuleAuditAction.MUTE,
          savedObject: { type: 'alert', id },
          error,
        })
      );
      throw error;
    }

    this.auditLogger?.log(
      ruleAuditEvent({
        action: RuleAuditAction.MUTE,
        outcome: 'unknown',
        savedObject: { type: 'alert', id },
      })
    );

    this.ruleTypeRegistry.ensureRuleTypeEnabled(attributes.alertTypeId);

    const updateAttributes = this.updateMeta({
      muteAll: true,
      mutedInstanceIds: [],
      snoozeSchedule: clearUnscheduledSnooze(attributes),
      updatedBy: await this.getUserName(),
      updatedAt: new Date().toISOString(),
    });
    const updateOptions = { version };

    await partiallyUpdateAlert(
      this.unsecuredSavedObjectsClient,
      id,
      updateAttributes,
      updateOptions
    );
  }

  public async unmuteAll({ id }: { id: string }): Promise<void> {
    return await retryIfConflicts(
      this.logger,
      `rulesClient.unmuteAll('${id}')`,
      async () => await this.unmuteAllWithOCC({ id })
    );
  }

  private async unmuteAllWithOCC({ id }: { id: string }) {
    const { attributes, version } = await this.unsecuredSavedObjectsClient.get<RawRule>(
      'alert',
      id
    );

    try {
      await this.authorization.ensureAuthorized({
        ruleTypeId: attributes.alertTypeId,
        consumer: attributes.consumer,
        operation: WriteOperations.UnmuteAll,
        entity: AlertingAuthorizationEntity.Rule,
      });

      if (attributes.actions.length) {
        await this.actionsAuthorization.ensureAuthorized('execute');
      }
    } catch (error) {
      this.auditLogger?.log(
        ruleAuditEvent({
          action: RuleAuditAction.UNMUTE,
          savedObject: { type: 'alert', id },
          error,
        })
      );
      throw error;
    }

    this.auditLogger?.log(
      ruleAuditEvent({
        action: RuleAuditAction.UNMUTE,
        outcome: 'unknown',
        savedObject: { type: 'alert', id },
      })
    );

    this.ruleTypeRegistry.ensureRuleTypeEnabled(attributes.alertTypeId);

    const updateAttributes = this.updateMeta({
      muteAll: false,
      mutedInstanceIds: [],
      snoozeSchedule: clearUnscheduledSnooze(attributes),
      updatedBy: await this.getUserName(),
      updatedAt: new Date().toISOString(),
    });
    const updateOptions = { version };

    await partiallyUpdateAlert(
      this.unsecuredSavedObjectsClient,
      id,
      updateAttributes,
      updateOptions
    );
  }

  public async muteInstance({ alertId, alertInstanceId }: MuteOptions): Promise<void> {
    return await retryIfConflicts(
      this.logger,
      `rulesClient.muteInstance('${alertId}')`,
      async () => await this.muteInstanceWithOCC({ alertId, alertInstanceId })
    );
  }

  private async muteInstanceWithOCC({ alertId, alertInstanceId }: MuteOptions) {
    const { attributes, version } = await this.unsecuredSavedObjectsClient.get<Rule>(
      'alert',
      alertId
    );

    try {
      await this.authorization.ensureAuthorized({
        ruleTypeId: attributes.alertTypeId,
        consumer: attributes.consumer,
        operation: WriteOperations.MuteAlert,
        entity: AlertingAuthorizationEntity.Rule,
      });

      if (attributes.actions.length) {
        await this.actionsAuthorization.ensureAuthorized('execute');
      }
    } catch (error) {
      this.auditLogger?.log(
        ruleAuditEvent({
          action: RuleAuditAction.MUTE_ALERT,
          savedObject: { type: 'alert', id: alertId },
          error,
        })
      );
      throw error;
    }

    this.auditLogger?.log(
      ruleAuditEvent({
        action: RuleAuditAction.MUTE_ALERT,
        outcome: 'unknown',
        savedObject: { type: 'alert', id: alertId },
      })
    );

    this.ruleTypeRegistry.ensureRuleTypeEnabled(attributes.alertTypeId);

    const mutedInstanceIds = attributes.mutedInstanceIds || [];
    if (!attributes.muteAll && !mutedInstanceIds.includes(alertInstanceId)) {
      mutedInstanceIds.push(alertInstanceId);
      await this.unsecuredSavedObjectsClient.update(
        'alert',
        alertId,
        this.updateMeta({
          mutedInstanceIds,
          updatedBy: await this.getUserName(),
          updatedAt: new Date().toISOString(),
        }),
        { version }
      );
    }
  }

  public async unmuteInstance({ alertId, alertInstanceId }: MuteOptions): Promise<void> {
    return await retryIfConflicts(
      this.logger,
      `rulesClient.unmuteInstance('${alertId}')`,
      async () => await this.unmuteInstanceWithOCC({ alertId, alertInstanceId })
    );
  }

  private async unmuteInstanceWithOCC({
    alertId,
    alertInstanceId,
  }: {
    alertId: string;
    alertInstanceId: string;
  }) {
    const { attributes, version } = await this.unsecuredSavedObjectsClient.get<Rule>(
      'alert',
      alertId
    );

    try {
      await this.authorization.ensureAuthorized({
        ruleTypeId: attributes.alertTypeId,
        consumer: attributes.consumer,
        operation: WriteOperations.UnmuteAlert,
        entity: AlertingAuthorizationEntity.Rule,
      });
      if (attributes.actions.length) {
        await this.actionsAuthorization.ensureAuthorized('execute');
      }
    } catch (error) {
      this.auditLogger?.log(
        ruleAuditEvent({
          action: RuleAuditAction.UNMUTE_ALERT,
          savedObject: { type: 'alert', id: alertId },
          error,
        })
      );
      throw error;
    }

    this.auditLogger?.log(
      ruleAuditEvent({
        action: RuleAuditAction.UNMUTE_ALERT,
        outcome: 'unknown',
        savedObject: { type: 'alert', id: alertId },
      })
    );

    this.ruleTypeRegistry.ensureRuleTypeEnabled(attributes.alertTypeId);

    const mutedInstanceIds = attributes.mutedInstanceIds || [];
    if (!attributes.muteAll && mutedInstanceIds.includes(alertInstanceId)) {
      await this.unsecuredSavedObjectsClient.update<RawRule>(
        'alert',
        alertId,
        this.updateMeta({
          updatedBy: await this.getUserName(),
          updatedAt: new Date().toISOString(),
          mutedInstanceIds: mutedInstanceIds.filter((id: string) => id !== alertInstanceId),
        }),
        { version }
      );
    }
  }

  public async runSoon({ id }: { id: string }) {
    const { attributes } = await this.unsecuredSavedObjectsClient.get<Rule>('alert', id);
    try {
      await this.authorization.ensureAuthorized({
        ruleTypeId: attributes.alertTypeId,
        consumer: attributes.consumer,
        operation: ReadOperations.RunSoon,
        entity: AlertingAuthorizationEntity.Rule,
      });

      if (attributes.actions.length) {
        await this.actionsAuthorization.ensureAuthorized('execute');
      }
    } catch (error) {
      this.auditLogger?.log(
        ruleAuditEvent({
          action: RuleAuditAction.RUN_SOON,
          savedObject: { type: 'alert', id },
          error,
        })
      );
      throw error;
    }

    this.auditLogger?.log(
      ruleAuditEvent({
        action: RuleAuditAction.RUN_SOON,
        outcome: 'unknown',
        savedObject: { type: 'alert', id },
      })
    );

    this.ruleTypeRegistry.ensureRuleTypeEnabled(attributes.alertTypeId);

    // Check that the rule is enabled
    if (!attributes.enabled) {
      return i18n.translate('xpack.alerting.rulesClient.runSoon.disabledRuleError', {
        defaultMessage: 'Error running rule: rule is disabled',
      });
    }

    let taskDoc: ConcreteTaskInstance | null = null;
    try {
      taskDoc = attributes.scheduledTaskId
        ? await this.taskManager.get(attributes.scheduledTaskId)
        : null;
    } catch (err) {
      return i18n.translate('xpack.alerting.rulesClient.runSoon.getTaskError', {
        defaultMessage: 'Error running rule: {errMessage}',
        values: {
          errMessage: err.message,
        },
      });
    }

    if (
      taskDoc &&
      (taskDoc.status === TaskStatus.Claiming || taskDoc.status === TaskStatus.Running)
    ) {
      return i18n.translate('xpack.alerting.rulesClient.runSoon.ruleIsRunning', {
        defaultMessage: 'Rule is already running',
      });
    }

    try {
      await this.taskManager.runSoon(attributes.scheduledTaskId ? attributes.scheduledTaskId : id);
    } catch (err) {
      return i18n.translate('xpack.alerting.rulesClient.runSoon.runSoonError', {
        defaultMessage: 'Error running rule: {errMessage}',
        values: {
          errMessage: err.message,
        },
      });
    }
  }

  public async listAlertTypes() {
    return await this.authorization.filterByRuleTypeAuthorization(
      this.ruleTypeRegistry.list(),
      [ReadOperations.Get, WriteOperations.Create],
      AlertingAuthorizationEntity.Rule
    );
  }

  public getSpaceId(): string | undefined {
    return this.spaceId;
  }

  private async scheduleTask(opts: ScheduleTaskOptions) {
    const { id, consumer, ruleTypeId, schedule, throwOnConflict } = opts;
    const taskInstance = {
      id, // use the same ID for task document as the rule
      taskType: `alerting:${ruleTypeId}`,
      schedule,
      params: {
        alertId: id,
        spaceId: this.spaceId,
        consumer,
      },
      state: {
        previousStartedAt: null,
        alertTypeState: {},
        alertInstances: {},
      },
      scope: ['alerting'],
      enabled: true,
    };
    try {
      return await this.taskManager.schedule(taskInstance);
    } catch (err) {
      if (err.statusCode === 409 && !throwOnConflict) {
        return taskInstance;
      }
      throw err;
    }
  }

  private injectReferencesIntoActions(
    alertId: string,
    actions: RawRule['actions'],
    references: SavedObjectReference[]
  ) {
    return actions.map((action) => {
      if (action.actionRef.startsWith(preconfiguredConnectorActionRefPrefix)) {
        return {
          ...omit(action, 'actionRef'),
          id: action.actionRef.replace(preconfiguredConnectorActionRefPrefix, ''),
        };
      }

      const reference = references.find((ref) => ref.name === action.actionRef);
      if (!reference) {
        throw new Error(`Action reference "${action.actionRef}" not found in alert id: ${alertId}`);
      }
      return {
        ...omit(action, 'actionRef'),
        id: reference.id,
      };
    }) as Rule['actions'];
  }

  private getAlertFromRaw<Params extends RuleTypeParams>(
    id: string,
    ruleTypeId: string,
    rawRule: RawRule,
    references: SavedObjectReference[] | undefined,
    includeLegacyId: boolean = false,
    excludeFromPublicApi: boolean = false,
    includeSnoozeData: boolean = false
  ): Rule | RuleWithLegacyId {
    const ruleType = this.ruleTypeRegistry.get(ruleTypeId);
    // In order to support the partial update API of Saved Objects we have to support
    // partial updates of an Alert, but when we receive an actual RawRule, it is safe
    // to cast the result to an Alert
    const res = this.getPartialRuleFromRaw<Params>(
      id,
      ruleType,
      rawRule,
      references,
      includeLegacyId,
      excludeFromPublicApi,
      includeSnoozeData
    );
    // include to result because it is for internal rules client usage
    if (includeLegacyId) {
      return res as RuleWithLegacyId;
    }
    // exclude from result because it is an internal variable
    return omit(res, ['legacyId']) as Rule;
  }

  private getPartialRuleFromRaw<Params extends RuleTypeParams>(
    id: string,
    ruleType: UntypedNormalizedRuleType,
    {
      createdAt,
      updatedAt,
      meta,
      notifyWhen,
      legacyId,
      scheduledTaskId,
      params,
      executionStatus,
      schedule,
      actions,
      snoozeSchedule,
      ...partialRawRule
    }: Partial<RawRule>,
    references: SavedObjectReference[] | undefined,
    includeLegacyId: boolean = false,
    excludeFromPublicApi: boolean = false,
    includeSnoozeData: boolean = false
  ): PartialRule<Params> | PartialRuleWithLegacyId<Params> {
    const snoozeScheduleDates = snoozeSchedule?.map((s) => ({
      ...s,
      rRule: {
        ...s.rRule,
        dtstart: new Date(s.rRule.dtstart),
        ...(s.rRule.until ? { until: new Date(s.rRule.until) } : {}),
      },
    }));
    const includeSnoozeSchedule =
      snoozeSchedule !== undefined && !isEmpty(snoozeSchedule) && !excludeFromPublicApi;
    const isSnoozedUntil = includeSnoozeSchedule
      ? this.calculateIsSnoozedUntil({
          muteAll: partialRawRule.muteAll ?? false,
          snoozeSchedule,
        })
      : null;
    const rule = {
      id,
      notifyWhen,
      ...omit(partialRawRule, excludeFromPublicApi ? [...this.fieldsToExcludeFromPublicApi] : ''),
      // we currently only support the Interval Schedule type
      // Once we support additional types, this type signature will likely change
      schedule: schedule as IntervalSchedule,
      actions: actions ? this.injectReferencesIntoActions(id, actions, references || []) : [],
      params: this.injectReferencesIntoParams(id, ruleType, params, references || []) as Params,
      ...(excludeFromPublicApi ? {} : { snoozeSchedule: snoozeScheduleDates ?? [] }),
      ...(includeSnoozeData && !excludeFromPublicApi
        ? {
            activeSnoozes: getActiveScheduledSnoozes({
              snoozeSchedule,
              muteAll: partialRawRule.muteAll ?? false,
            })?.map((s) => s.id),
            isSnoozedUntil,
          }
        : {}),
      ...(updatedAt ? { updatedAt: new Date(updatedAt) } : {}),
      ...(createdAt ? { createdAt: new Date(createdAt) } : {}),
      ...(scheduledTaskId ? { scheduledTaskId } : {}),
      ...(executionStatus
        ? { executionStatus: ruleExecutionStatusFromRaw(this.logger, id, executionStatus) }
        : {}),
    };

    return includeLegacyId
      ? ({ ...rule, legacyId } as PartialRuleWithLegacyId<Params>)
      : (rule as PartialRule<Params>);
  }

  private async validateActions(
    alertType: UntypedNormalizedRuleType,
    actions: NormalizedAlertAction[]
  ): Promise<void> {
    if (actions.length === 0) {
      return;
    }

    // check for actions using connectors with missing secrets
    const actionsClient = await this.getActionsClient();
    const actionIds = [...new Set(actions.map((action) => action.id))];
    const actionResults = (await actionsClient.getBulk(actionIds)) || [];
    const actionsUsingConnectorsWithMissingSecrets = actionResults.filter(
      (result) => result.isMissingSecrets
    );

    if (actionsUsingConnectorsWithMissingSecrets.length) {
      throw Boom.badRequest(
        i18n.translate('xpack.alerting.rulesClient.validateActions.misconfiguredConnector', {
          defaultMessage: 'Invalid connectors: {groups}',
          values: {
            groups: actionsUsingConnectorsWithMissingSecrets
              .map((connector) => connector.name)
              .join(', '),
          },
        })
      );
    }

    // check for actions with invalid action groups
    const { actionGroups: alertTypeActionGroups } = alertType;
    const usedAlertActionGroups = actions.map((action) => action.group);
    const availableAlertTypeActionGroups = new Set(map(alertTypeActionGroups, 'id'));
    const invalidActionGroups = usedAlertActionGroups.filter(
      (group) => !availableAlertTypeActionGroups.has(group)
    );
    if (invalidActionGroups.length) {
      throw Boom.badRequest(
        i18n.translate('xpack.alerting.rulesClient.validateActions.invalidGroups', {
          defaultMessage: 'Invalid action groups: {groups}',
          values: {
            groups: invalidActionGroups.join(', '),
          },
        })
      );
    }
  }

  private async extractReferences<
    Params extends RuleTypeParams,
    ExtractedParams extends RuleTypeParams
  >(
    ruleType: UntypedNormalizedRuleType,
    ruleActions: NormalizedAlertAction[],
    ruleParams: Params
  ): Promise<{
    actions: RawRule['actions'];
    params: ExtractedParams;
    references: SavedObjectReference[];
  }> {
    const { references: actionReferences, actions } = await this.denormalizeActions(ruleActions);

    // Extracts any references using configured reference extractor if available
    const extractedRefsAndParams = ruleType?.useSavedObjectReferences?.extractReferences
      ? ruleType.useSavedObjectReferences.extractReferences(ruleParams)
      : null;
    const extractedReferences = extractedRefsAndParams?.references ?? [];
    const params = (extractedRefsAndParams?.params as ExtractedParams) ?? ruleParams;

    // Prefix extracted references in order to avoid clashes with framework level references
    const paramReferences = extractedReferences.map((reference: SavedObjectReference) => ({
      ...reference,
      name: `${extractedSavedObjectParamReferenceNamePrefix}${reference.name}`,
    }));

    const references = [...actionReferences, ...paramReferences];

    return {
      actions,
      params,
      references,
    };
  }

  private injectReferencesIntoParams<
    Params extends RuleTypeParams,
    ExtractedParams extends RuleTypeParams
  >(
    ruleId: string,
    ruleType: UntypedNormalizedRuleType,
    ruleParams: SavedObjectAttributes | undefined,
    references: SavedObjectReference[]
  ): Params {
    try {
      const paramReferences = references
        .filter((reference: SavedObjectReference) =>
          reference.name.startsWith(extractedSavedObjectParamReferenceNamePrefix)
        )
        .map((reference: SavedObjectReference) => ({
          ...reference,
          name: reference.name.replace(extractedSavedObjectParamReferenceNamePrefix, ''),
        }));
      return ruleParams && ruleType?.useSavedObjectReferences?.injectReferences
        ? (ruleType.useSavedObjectReferences.injectReferences(
            ruleParams as ExtractedParams,
            paramReferences
          ) as Params)
        : (ruleParams as Params);
    } catch (err) {
      throw Boom.badRequest(
        `Error injecting reference into rule params for rule id ${ruleId} - ${err.message}`
      );
    }
  }

  private async denormalizeActions(
    alertActions: NormalizedAlertAction[]
  ): Promise<{ actions: RawRule['actions']; references: SavedObjectReference[] }> {
    const references: SavedObjectReference[] = [];
    const actions: RawRule['actions'] = [];
    if (alertActions.length) {
      const actionsClient = await this.getActionsClient();
      const actionIds = [...new Set(alertActions.map((alertAction) => alertAction.id))];
      const actionResults = await actionsClient.getBulk(actionIds);
      const actionTypeIds = [...new Set(actionResults.map((action) => action.actionTypeId))];
      actionTypeIds.forEach((id) => {
        // Notify action type usage via "isActionTypeEnabled" function
        actionsClient.isActionTypeEnabled(id, { notifyUsage: true });
      });
      alertActions.forEach(({ id, ...alertAction }, i) => {
        const actionResultValue = actionResults.find((action) => action.id === id);
        if (actionResultValue) {
          if (actionsClient.isPreconfigured(id)) {
            actions.push({
              ...alertAction,
              actionRef: `${preconfiguredConnectorActionRefPrefix}${id}`,
              actionTypeId: actionResultValue.actionTypeId,
            });
          } else {
            const actionRef = `action_${i}`;
            references.push({
              id,
              name: actionRef,
              type: 'action',
            });
            actions.push({
              ...alertAction,
              actionRef,
              actionTypeId: actionResultValue.actionTypeId,
            });
          }
        } else {
          actions.push({
            ...alertAction,
            actionRef: '',
            actionTypeId: '',
          });
        }
      });
    }
    return {
      actions,
      references,
    };
  }

  private includeFieldsRequiredForAuthentication(fields: string[]): string[] {
    return uniq([...fields, 'alertTypeId', 'consumer']);
  }

  private generateAPIKeyName(alertTypeId: string, alertName: string) {
    return truncate(`Alerting: ${alertTypeId}/${trim(alertName)}`, { length: 256 });
  }

  private updateMeta<T extends Partial<RawRule>>(alertAttributes: T): T {
    if (alertAttributes.hasOwnProperty('apiKey') || alertAttributes.hasOwnProperty('apiKeyOwner')) {
      alertAttributes.meta = alertAttributes.meta ?? {};
      alertAttributes.meta.versionApiKeyLastmodified = this.kibanaVersion;
    }
    return alertAttributes;
  }
}

function parseDate(dateString: string | undefined, propertyName: string, defaultValue: Date): Date {
  if (dateString === undefined) {
    return defaultValue;
  }

  const parsedDate = parseIsoOrRelativeDate(dateString);
  if (parsedDate === undefined) {
    throw Boom.badRequest(
      i18n.translate('xpack.alerting.rulesClient.invalidDate', {
        defaultMessage: 'Invalid date for parameter {field}: "{dateValue}"',
        values: {
          field: propertyName,
          dateValue: dateString,
        },
      })
    );
  }

  return parsedDate;
}

function getSnoozeAttributes(attributes: RawRule, snoozeSchedule: RuleSnoozeSchedule) {
  // If duration is -1, instead mute all
  const { id: snoozeId, duration } = snoozeSchedule;

  if (duration === -1) {
    return {
      muteAll: true,
      snoozeSchedule: clearUnscheduledSnooze(attributes),
    };
  }
  return {
    snoozeSchedule: (snoozeId
      ? clearScheduledSnoozesById(attributes, [snoozeId])
      : clearUnscheduledSnooze(attributes)
    ).concat(snoozeSchedule),
    muteAll: false,
  };
}

function getBulkSnoozeAttributes(attributes: RawRule, snoozeSchedule: RuleSnoozeSchedule) {
  // If duration is -1, instead mute all
  const { id: snoozeId, duration } = snoozeSchedule;

  if (duration === -1) {
    return {
      muteAll: true,
      snoozeSchedule: clearUnscheduledSnooze(attributes),
    };
  }

  // Bulk adding snooze schedule, don't touch the existing snooze/indefinite snooze
  if (snoozeId) {
    const existingSnoozeSchedules = attributes.snoozeSchedule || [];
    return {
      muteAll: attributes.muteAll,
      snoozeSchedule: [...existingSnoozeSchedules, snoozeSchedule],
    };
  }

  // Bulk snoozing, don't touch the existing snooze schedules
  return {
    muteAll: false,
    snoozeSchedule: [...clearUnscheduledSnooze(attributes), snoozeSchedule],
  };
}

function getUnsnoozeAttributes(attributes: RawRule, scheduleIds?: string[]) {
  const snoozeSchedule = scheduleIds
    ? clearScheduledSnoozesById(attributes, scheduleIds)
    : clearCurrentActiveSnooze(attributes);

  return {
    snoozeSchedule,
    ...(!scheduleIds ? { muteAll: false } : {}),
  };
}

function getBulkUnsnoozeAttributes(attributes: RawRule, scheduleIds?: string[]) {
  // Bulk removing snooze schedules, don't touch the current snooze/indefinite snooze
  if (scheduleIds) {
    const newSchedules = clearScheduledSnoozesById(attributes, scheduleIds);
    // Unscheduled snooze is also known as snooze now
    const unscheduledSnooze =
      attributes.snoozeSchedule?.filter((s) => typeof s.id === 'undefined') || [];

    return {
      snoozeSchedule: [...unscheduledSnooze, ...newSchedules],
      muteAll: attributes.muteAll,
    };
  }

  // Bulk unsnoozing, don't touch current snooze schedules that are NOT active
  return {
    snoozeSchedule: clearCurrentActiveSnooze(attributes),
    muteAll: false,
  };
}

function clearUnscheduledSnooze(attributes: RawRule) {
  // Clear any snoozes that have no ID property. These are "simple" snoozes created with the quick UI, e.g. snooze for 3 days starting now
  return attributes.snoozeSchedule
    ? attributes.snoozeSchedule.filter((s) => typeof s.id !== 'undefined')
    : [];
}

function clearScheduledSnoozesById(attributes: RawRule, ids: string[]) {
  return attributes.snoozeSchedule
    ? attributes.snoozeSchedule.filter((s) => s.id && !ids.includes(s.id))
    : [];
}

function clearCurrentActiveSnooze(attributes: RawRule) {
  // First attempt to cancel a simple (unscheduled) snooze
  const clearedUnscheduledSnoozes = clearUnscheduledSnooze(attributes);
  // Now clear any scheduled snoozes that are currently active and never recur
  const activeSnoozes = getActiveScheduledSnoozes(attributes);
  const activeSnoozeIds = activeSnoozes?.map((s) => s.id) ?? [];
  const recurringSnoozesToSkip: string[] = [];
  const clearedNonRecurringActiveSnoozes = clearedUnscheduledSnoozes.filter((s) => {
    if (!activeSnoozeIds.includes(s.id!)) return true;
    // Check if this is a recurring snooze, and return true if so
    if (s.rRule.freq && s.rRule.count !== 1) {
      recurringSnoozesToSkip.push(s.id!);
      return true;
    }
  });
  const clearedSnoozesAndSkippedRecurringSnoozes = clearedNonRecurringActiveSnoozes.map((s) => {
    if (s.id && !recurringSnoozesToSkip.includes(s.id)) return s;
    const currentRecurrence = activeSnoozes?.find((a) => a.id === s.id)?.lastOccurrence;
    if (!currentRecurrence) return s;
    return {
      ...s,
      skipRecurrences: (s.skipRecurrences ?? []).concat(currentRecurrence.toISOString()),
    };
  });
  return clearedSnoozesAndSkippedRecurringSnoozes;
}

function verifySnoozeScheduleLimit(attributes: Partial<RawRule>) {
  const schedules = attributes.snoozeSchedule?.filter((snooze) => snooze.id);
  if (schedules && schedules.length > 5) {
    throw Error(
      i18n.translate('xpack.alerting.rulesClient.snoozeSchedule.limitReached', {
        defaultMessage: 'Rule cannot have more than 5 snooze schedules',
      })
    );
  }
}
