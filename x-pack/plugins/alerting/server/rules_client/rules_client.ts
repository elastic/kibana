/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Semver from 'semver';
import Boom from '@hapi/boom';
import { omit, isEqual, map, uniq, pick, truncate, trim, mapValues } from 'lodash';
import { i18n } from '@kbn/i18n';
import { fromKueryExpression, KueryNode, nodeBuilder } from '@kbn/es-query';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import {
  Logger,
  SavedObjectsClientContract,
  SavedObjectReference,
  SavedObject,
  PluginInitializerContext,
  SavedObjectsUtils,
  SavedObjectAttributes,
} from '../../../../../src/core/server';
import { ActionsClient, ActionsAuthorization } from '../../../actions/server';
import {
  Alert as Rule,
  PartialAlert as PartialRule,
  RawRule,
  RuleTypeRegistry,
  AlertAction as RuleAction,
  IntervalSchedule,
  SanitizedAlert as SanitizedRule,
  RuleTaskState,
  AlertSummary,
  AlertExecutionStatusValues as RuleExecutionStatusValues,
  AlertNotifyWhenType as RuleNotifyWhenType,
  AlertTypeParams as RuleTypeParams,
  ResolvedSanitizedRule,
  AlertWithLegacyId as RuleWithLegacyId,
  SanitizedRuleWithLegacyId,
  PartialAlertWithLegacyId as PartialRuleWithLegacyId,
  RawAlertInstance as RawAlert,
} from '../types';
import { validateRuleTypeParams, ruleExecutionStatusFromRaw, getAlertNotifyWhenType } from '../lib';
import {
  GrantAPIKeyResult as SecurityPluginGrantAPIKeyResult,
  InvalidateAPIKeyResult as SecurityPluginInvalidateAPIKeyResult,
} from '../../../security/server';
import { EncryptedSavedObjectsClient } from '../../../encrypted_saved_objects/server';
import { TaskManagerStartContract } from '../../../task_manager/server';
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
import {
  IEvent,
  IEventLogClient,
  IEventLogger,
  SAVED_OBJECT_REL_PRIMARY,
} from '../../../event_log/server';
import { parseIsoOrRelativeDate } from '../lib/iso_or_relative_date';
import { alertSummaryFromEventLog } from '../lib/alert_summary_from_event_log';
import { AuditLogger } from '../../../security/server';
import { parseDuration } from '../../common/parse_duration';
import { retryIfConflicts } from '../lib/retry_if_conflicts';
import { partiallyUpdateAlert } from '../saved_objects';
import { markApiKeyForInvalidation } from '../invalidate_pending_api_keys/mark_api_key_for_invalidation';
import { ruleAuditEvent, RuleAuditAction } from './audit_events';
import { mapSortField, validateOperationOnAttributes } from './lib';
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
  getExecutionLogAggregation,
  IExecutionLogResult,
} from '../lib/get_execution_log_aggregation';
import { validateSnoozeDate } from '../lib/validate_snooze_date';
import { RuleMutedError } from '../lib/errors/rule_muted';

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
  spaceId?: string;
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
  snoozeEndTime: string | -1;
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
  filter?: string;
}

export interface AggregateOptions extends IndexType {
  search?: string;
  defaultSearchOperator?: 'AND' | 'OR';
  searchFields?: string[];
  hasReference?: {
    type: string;
    id: string;
  };
  filter?: string;
}

interface IndexType {
  [key: string]: unknown;
}

export interface AggregateResult {
  alertExecutionStatus: { [status: string]: number };
  ruleEnabledStatus?: { enabled: number; disabled: number };
  ruleMutedStatus?: { muted: number; unmuted: number };
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
    | 'snoozeEndTime'
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

// NOTE: Changing this prefix will require a migration to update the prefix in all existing `rule` saved objects
const extractedSavedObjectParamReferenceNamePrefix = 'param:';

// NOTE: Changing this prefix will require a migration to update the prefix in all existing `rule` saved objects
const preconfiguredConnectorActionRefPrefix = 'preconfigured:';

const alertingAuthorizationFilterOpts: AlertingAuthorizationFilterOpts = {
  type: AlertingAuthorizationFilterType.KQL,
  fieldNames: { ruleTypeId: 'alert.attributes.alertTypeId', consumer: 'alert.attributes.consumer' },
};
export class RulesClient {
  private readonly logger: Logger;
  private readonly getUserName: () => Promise<string | null>;
  private readonly spaceId?: string;
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
    'snoozeEndTime',
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

    // Validate that schedule interval is not less than configured minimum
    const intervalInMs = parseDuration(data.schedule.interval);
    if (intervalInMs < this.minimumScheduleIntervalInMs) {
      if (this.minimumScheduleInterval.enforce) {
        throw Boom.badRequest(
          `Error creating rule: the interval is less than the allowed minimum interval of ${this.minimumScheduleInterval.value}`
        );
      } else {
        // just log warning but allow rule to be created
        this.logger.warn(
          `Rule schedule interval (${data.schedule.interval}) is less than the minimum value (${this.minimumScheduleInterval.value}). Running rules at this interval may impact alerting performance. Set "xpack.alerting.rules.minimumScheduleInterval.enforce" to true to prevent creation of these rules.`
        );
      }
    }

    // Extract saved object references for this rule
    const {
      references,
      params: updatedParams,
      actions,
    } = await this.extractReferences(ruleType, data.actions, validatedAlertTypeParams);

    const createTime = Date.now();
    const legacyId = Semver.lt(this.kibanaVersion, '8.0.0') ? id : null;
    const notifyWhen = getAlertNotifyWhenType(data.notifyWhen, data.throttle);

    const rawRule: RawRule = {
      ...data,
      ...this.apiKeyAsAlertAttributes(createdAPIKey, username),
      legacyId,
      actions,
      createdBy: username,
      updatedBy: username,
      createdAt: new Date(createTime).toISOString(),
      updatedAt: new Date(createTime).toISOString(),
      snoozeEndTime: null,
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
      markApiKeyForInvalidation(
        { apiKey: rawRule.apiKey },
        this.logger,
        this.unsecuredSavedObjectsClient
      );
      throw e;
    }
    if (data.enabled) {
      let scheduledTask;
      try {
        scheduledTask = await this.scheduleRule(
          createdAlert.id,
          rawRule.alertTypeId,
          data.schedule,
          true
        );
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
    excludeFromPublicApi = false,
  }: {
    id: string;
    includeLegacyId?: boolean;
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
      excludeFromPublicApi
    );
  }

  public async resolve<Params extends RuleTypeParams = never>({
    id,
    includeLegacyId,
  }: {
    id: string;
    includeLegacyId?: boolean;
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
      includeLegacyId
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

    // default duration of instance summary is 60 * rule interval
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

    const results = await eventLogClient.aggregateEventsBySavedObjectIds(
      'alert',
      [id],
      {
        start: parsedDateStart.toISOString(),
        end: parsedDateEnd.toISOString(),
        filter,
        aggs: getExecutionLogAggregation({
          page,
          perPage,
          sort,
        }),
      },
      rule.legacyId !== null ? [rule.legacyId] : undefined
    );

    return formatExecutionLogResult(results);
  }

  public async find<Params extends RuleTypeParams = never>({
    options: { fields, ...options } = {},
    excludeFromPublicApi = false,
  }: { options?: FindOptions; excludeFromPublicApi?: boolean } = {}): Promise<FindResult<Params>> {
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
    const filterKueryNode = options.filter ? fromKueryExpression(options.filter) : null;
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
          : authorizationFilter) ?? options.filter,
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
        excludeFromPublicApi
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
    const resp = await this.unsecuredSavedObjectsClient.find<RawRule, RuleAggregation>({
      ...options,
      filter:
        (authorizationFilter && filter
          ? nodeBuilder.and([fromKueryExpression(filter), authorizationFilter as KueryNode])
          : authorizationFilter) ?? filter,
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
        ? markApiKeyForInvalidation(
            { apiKey: apiKeyToInvalidate },
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
        ? markApiKeyForInvalidation(
            { apiKey: alertSavedObject.attributes.apiKey },
            this.logger,
            this.unsecuredSavedObjectsClient
          )
        : null,
      (async () => {
        if (
          updateResult.scheduledTaskId &&
          !isEqual(alertSavedObject.attributes.schedule, updateResult.schedule)
        ) {
          this.taskManager
            .runNow(updateResult.scheduledTaskId)
            .then(() => {
              this.logger.debug(
                `Alert update has rescheduled the underlying task: ${updateResult.scheduledTaskId}`
              );
            })
            .catch((err: Error) => {
              this.logger.error(
                `Alert update failed to run its underlying task. TaskManager runNow failed with Error: ${err.message}`
              );
            });
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

    // Validate that schedule interval is not less than configured minimum
    const intervalInMs = parseDuration(data.schedule.interval);
    if (intervalInMs < this.minimumScheduleIntervalInMs) {
      if (this.minimumScheduleInterval.enforce) {
        throw Boom.badRequest(
          `Error updating rule: the interval is less than the allowed minimum interval of ${this.minimumScheduleInterval.value}`
        );
      } else {
        // just log warning but allow rule to be updated
        this.logger.warn(
          `Rule schedule interval (${data.schedule.interval}) is less than the minimum value (${this.minimumScheduleInterval.value}). Running rules at this interval may impact alerting performance. Set "xpack.alerting.rules.minimumScheduleInterval.enforce" to true to prevent such changes.`
        );
      }
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
    const notifyWhen = getAlertNotifyWhenType(data.notifyWhen, data.throttle);

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
      markApiKeyForInvalidation(
        { apiKey: createAttributes.apiKey },
        this.logger,
        this.unsecuredSavedObjectsClient
      );
      throw e;
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
      markApiKeyForInvalidation(
        { apiKey: updateAttributes.apiKey },
        this.logger,
        this.unsecuredSavedObjectsClient
      );
      throw e;
    }

    if (apiKeyToInvalidate) {
      await markApiKeyForInvalidation(
        { apiKey: apiKeyToInvalidate },
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
        `enable(): Failed to load API key to invalidate on alert ${id}: ${e.message}`
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

      let createdAPIKey = null;
      try {
        createdAPIKey = await this.createAPIKey(
          this.generateAPIKeyName(attributes.alertTypeId, attributes.name)
        );
      } catch (error) {
        throw Boom.badRequest(`Error enabling rule: could not create API key - ${error.message}`);
      }

      const updateAttributes = this.updateMeta({
        ...attributes,
        enabled: true,
        ...this.apiKeyAsAlertAttributes(createdAPIKey, username),
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
        // Avoid unused API key
        markApiKeyForInvalidation(
          { apiKey: updateAttributes.apiKey },
          this.logger,
          this.unsecuredSavedObjectsClient
        );
        throw e;
      }
      const scheduledTask = await this.scheduleRule(
        id,
        attributes.alertTypeId,
        attributes.schedule as IntervalSchedule,
        false
      );
      await this.unsecuredSavedObjectsClient.update('alert', id, {
        scheduledTaskId: scheduledTask.id,
      });
      if (apiKeyToInvalidate) {
        await markApiKeyForInvalidation(
          { apiKey: apiKeyToInvalidate },
          this.logger,
          this.unsecuredSavedObjectsClient
        );
      }
    }
  }

  public async disable({ id }: { id: string }): Promise<void> {
    return await retryIfConflicts(
      this.logger,
      `rulesClient.disable('${id}')`,
      async () => await this.disableWithOCC({ id })
    );
  }

  private async disableWithOCC({ id }: { id: string }) {
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
        `disable(): Failed to load API key to invalidate on alert ${id}: ${e.message}`
      );
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
          const { group: actionGroup, subgroup: actionSubgroup } =
            recoveredAlertInstances[instanceId].getLastScheduledActions() ?? {};
          const instanceState = recoveredAlertInstances[instanceId].getState();
          const message = `instance '${instanceId}' has recovered due to the rule was disabled`;

          const event = createAlertEventLogRecordObject({
            ruleId: id,
            ruleName: attributes.name,
            ruleType: this.ruleTypeRegistry.get(attributes.alertTypeId),
            instanceId,
            action: EVENT_LOG_ACTIONS.recoveredInstance,
            message,
            state: instanceState,
            group: actionGroup,
            subgroup: actionSubgroup,
            namespace: this.namespace,
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
          scheduledTaskId: null,
          apiKey: null,
          apiKeyOwner: null,
          updatedBy: await this.getUserName(),
          updatedAt: new Date().toISOString(),
        }),
        { version }
      );

      await Promise.all([
        attributes.scheduledTaskId
          ? this.taskManager.removeIfExists(attributes.scheduledTaskId)
          : null,
        apiKeyToInvalidate
          ? await markApiKeyForInvalidation(
              { apiKey: apiKeyToInvalidate },
              this.logger,
              this.unsecuredSavedObjectsClient
            )
          : null,
      ]);
    }
  }

  public async snooze({
    id,
    snoozeEndTime,
  }: {
    id: string;
    snoozeEndTime: string | -1;
  }): Promise<void> {
    if (typeof snoozeEndTime === 'string') {
      const snoozeDateValidationMsg = validateSnoozeDate(snoozeEndTime);
      if (snoozeDateValidationMsg) {
        throw new RuleMutedError(snoozeDateValidationMsg);
      }
    }
    return await retryIfConflicts(
      this.logger,
      `rulesClient.snooze('${id}', ${snoozeEndTime})`,
      async () => await this.snoozeWithOCC({ id, snoozeEndTime })
    );
  }

  private async snoozeWithOCC({ id, snoozeEndTime }: { id: string; snoozeEndTime: string | -1 }) {
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

    // If snoozeEndTime is -1, instead mute all
    const newAttrs =
      snoozeEndTime === -1
        ? { muteAll: true, snoozeEndTime: null }
        : { snoozeEndTime: new Date(snoozeEndTime).toISOString(), muteAll: false };

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

  public async unsnooze({ id }: { id: string }): Promise<void> {
    return await retryIfConflicts(
      this.logger,
      `rulesClient.unsnooze('${id}')`,
      async () => await this.unsnoozeWithOCC({ id })
    );
  }

  private async unsnoozeWithOCC({ id }: { id: string }) {
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

    const updateAttributes = this.updateMeta({
      snoozeEndTime: null,
      muteAll: false,
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
      snoozeEndTime: null,
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
      snoozeEndTime: null,
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

  private async scheduleRule(
    id: string,
    ruleTypeId: string,
    schedule: IntervalSchedule,
    throwOnConflict: boolean // whether to throw conflict errors or swallow them
  ) {
    const taskInstance = {
      id, // use the same ID for task document as the rule
      taskType: `alerting:${ruleTypeId}`,
      schedule,
      params: {
        alertId: id,
        spaceId: this.spaceId,
      },
      state: {
        previousStartedAt: null,
        alertTypeState: {},
        alertInstances: {},
      },
      scope: ['alerting'],
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
    excludeFromPublicApi: boolean = false
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
      excludeFromPublicApi
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
      ...partialRawRule
    }: Partial<RawRule>,
    references: SavedObjectReference[] | undefined,
    includeLegacyId: boolean = false,
    excludeFromPublicApi: boolean = false
  ): PartialRule<Params> | PartialRuleWithLegacyId<Params> {
    const rule = {
      id,
      notifyWhen,
      ...omit(partialRawRule, excludeFromPublicApi ? [...this.fieldsToExcludeFromPublicApi] : ''),
      // we currently only support the Interval Schedule type
      // Once we support additional types, this type signature will likely change
      schedule: schedule as IntervalSchedule,
      actions: actions ? this.injectReferencesIntoActions(id, actions, references || []) : [],
      params: this.injectReferencesIntoParams(id, ruleType, params, references || []) as Params,
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
