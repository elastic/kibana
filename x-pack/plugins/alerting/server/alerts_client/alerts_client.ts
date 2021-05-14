/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { omit, isEqual, map, uniq, pick, truncate, trim } from 'lodash';
import { i18n } from '@kbn/i18n';
import { estypes } from '@elastic/elasticsearch';
import {
  Logger,
  SavedObjectsClientContract,
  SavedObjectReference,
  SavedObject,
  PluginInitializerContext,
  SavedObjectsUtils,
} from '../../../../../src/core/server';
import { esKuery } from '../../../../../src/plugins/data/server';
import { ActionsClient, ActionsAuthorization } from '../../../actions/server';
import {
  Alert,
  PartialAlert,
  RawAlert,
  AlertTypeRegistry,
  AlertAction,
  IntervalSchedule,
  SanitizedAlert,
  AlertTaskState,
  AlertInstanceSummary,
  AlertExecutionStatusValues,
  AlertNotifyWhenType,
  AlertTypeParams,
} from '../types';
import {
  validateAlertTypeParams,
  alertExecutionStatusFromRaw,
  getAlertNotifyWhenType,
} from '../lib';
import {
  GrantAPIKeyResult as SecurityPluginGrantAPIKeyResult,
  InvalidateAPIKeyResult as SecurityPluginInvalidateAPIKeyResult,
} from '../../../security/server';
import { EncryptedSavedObjectsClient } from '../../../encrypted_saved_objects/server';
import { TaskManagerStartContract } from '../../../task_manager/server';
import { taskInstanceToAlertTaskInstance } from '../task_runner/alert_task_instance';
import { RegistryAlertType, UntypedNormalizedAlertType } from '../alert_type_registry';
import { AlertsAuthorization, WriteOperations, ReadOperations } from '../authorization';
import { IEventLogClient } from '../../../../plugins/event_log/server';
import { parseIsoOrRelativeDate } from '../lib/iso_or_relative_date';
import { alertInstanceSummaryFromEventLog } from '../lib/alert_instance_summary_from_event_log';
import { IEvent } from '../../../event_log/server';
import { AuditLogger } from '../../../security/server';
import { parseDuration } from '../../common/parse_duration';
import { retryIfConflicts } from '../lib/retry_if_conflicts';
import { partiallyUpdateAlert } from '../saved_objects';
import { markApiKeyForInvalidation } from '../invalidate_pending_api_keys/mark_api_key_for_invalidation';
import { alertAuditEvent, AlertAuditAction } from './audit_events';
import { nodeBuilder } from '../../../../../src/plugins/data/common';
import { mapSortField } from './lib';

export interface RegistryAlertTypeWithAuth extends RegistryAlertType {
  authorizedConsumers: string[];
}
type NormalizedAlertAction = Omit<AlertAction, 'actionTypeId'>;
export type CreateAPIKeyResult =
  | { apiKeysEnabled: false }
  | { apiKeysEnabled: true; result: SecurityPluginGrantAPIKeyResult };
export type InvalidateAPIKeyResult =
  | { apiKeysEnabled: false }
  | { apiKeysEnabled: true; result: SecurityPluginInvalidateAPIKeyResult };

export interface ConstructorOptions {
  logger: Logger;
  taskManager: TaskManagerStartContract;
  unsecuredSavedObjectsClient: SavedObjectsClientContract;
  authorization: AlertsAuthorization;
  actionsAuthorization: ActionsAuthorization;
  alertTypeRegistry: AlertTypeRegistry;
  encryptedSavedObjectsClient: EncryptedSavedObjectsClient;
  spaceId?: string;
  namespace?: string;
  getUserName: () => Promise<string | null>;
  createAPIKey: (name: string) => Promise<CreateAPIKeyResult>;
  getActionsClient: () => Promise<ActionsClient>;
  getEventLogClient: () => Promise<IEventLogClient>;
  kibanaVersion: PluginInitializerContext['env']['packageInfo']['version'];
  auditLogger?: AuditLogger;
}

export interface MuteOptions extends IndexType {
  alertId: string;
  alertInstanceId: string;
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
}

export interface FindResult<Params extends AlertTypeParams> {
  page: number;
  perPage: number;
  total: number;
  data: Array<SanitizedAlert<Params>>;
}

export interface CreateOptions<Params extends AlertTypeParams> {
  data: Omit<
    Alert<Params>,
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
  > & { actions: NormalizedAlertAction[] };
  options?: {
    id?: string;
    migrationVersion?: Record<string, string>;
  };
}

export interface UpdateOptions<Params extends AlertTypeParams> {
  id: string;
  data: {
    name: string;
    tags: string[];
    schedule: IntervalSchedule;
    actions: NormalizedAlertAction[];
    params: Params;
    throttle: string | null;
    notifyWhen: AlertNotifyWhenType | null;
  };
}

export interface GetAlertInstanceSummaryParams {
  id: string;
  dateStart?: string;
}

export class AlertsClient {
  private readonly logger: Logger;
  private readonly getUserName: () => Promise<string | null>;
  private readonly spaceId?: string;
  private readonly namespace?: string;
  private readonly taskManager: TaskManagerStartContract;
  private readonly unsecuredSavedObjectsClient: SavedObjectsClientContract;
  private readonly authorization: AlertsAuthorization;
  private readonly alertTypeRegistry: AlertTypeRegistry;
  private readonly createAPIKey: (name: string) => Promise<CreateAPIKeyResult>;
  private readonly getActionsClient: () => Promise<ActionsClient>;
  private readonly actionsAuthorization: ActionsAuthorization;
  private readonly getEventLogClient: () => Promise<IEventLogClient>;
  private readonly encryptedSavedObjectsClient: EncryptedSavedObjectsClient;
  private readonly kibanaVersion!: PluginInitializerContext['env']['packageInfo']['version'];
  private readonly auditLogger?: AuditLogger;

  constructor({
    alertTypeRegistry,
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
  }: ConstructorOptions) {
    this.logger = logger;
    this.getUserName = getUserName;
    this.spaceId = spaceId;
    this.namespace = namespace;
    this.taskManager = taskManager;
    this.alertTypeRegistry = alertTypeRegistry;
    this.unsecuredSavedObjectsClient = unsecuredSavedObjectsClient;
    this.authorization = authorization;
    this.createAPIKey = createAPIKey;
    this.encryptedSavedObjectsClient = encryptedSavedObjectsClient;
    this.getActionsClient = getActionsClient;
    this.actionsAuthorization = actionsAuthorization;
    this.getEventLogClient = getEventLogClient;
    this.kibanaVersion = kibanaVersion;
    this.auditLogger = auditLogger;
  }

  public async create<Params extends AlertTypeParams = never>({
    data,
    options,
  }: CreateOptions<Params>): Promise<SanitizedAlert<Params>> {
    const id = options?.id || SavedObjectsUtils.generateId();

    try {
      await this.authorization.ensureAuthorized(
        data.alertTypeId,
        data.consumer,
        WriteOperations.Create
      );
    } catch (error) {
      this.auditLogger?.log(
        alertAuditEvent({
          action: AlertAuditAction.CREATE,
          savedObject: { type: 'alert', id },
          error,
        })
      );
      throw error;
    }

    this.alertTypeRegistry.ensureAlertTypeEnabled(data.alertTypeId);

    // Throws an error if alert type isn't registered
    const alertType = this.alertTypeRegistry.get(data.alertTypeId);

    const validatedAlertTypeParams = validateAlertTypeParams(
      data.params,
      alertType.validate?.params
    );
    const username = await this.getUserName();

    let createdAPIKey = null;
    try {
      createdAPIKey = data.enabled
        ? await this.createAPIKey(this.generateAPIKeyName(alertType.id, data.name))
        : null;
    } catch (error) {
      throw Boom.badRequest(`Error creating rule: could not create API key - ${error.message}`);
    }

    await this.validateActions(alertType, data.actions);

    const createTime = Date.now();
    const { references, actions } = await this.denormalizeActions(data.actions);

    const notifyWhen = getAlertNotifyWhenType(data.notifyWhen, data.throttle);

    const rawAlert: RawAlert = {
      ...data,
      ...this.apiKeyAsAlertAttributes(createdAPIKey, username),
      actions,
      createdBy: username,
      updatedBy: username,
      createdAt: new Date(createTime).toISOString(),
      updatedAt: new Date(createTime).toISOString(),
      params: validatedAlertTypeParams as RawAlert['params'],
      muteAll: false,
      mutedInstanceIds: [],
      notifyWhen,
      executionStatus: {
        status: 'pending',
        lastExecutionDate: new Date().toISOString(),
        error: null,
      },
    };

    this.auditLogger?.log(
      alertAuditEvent({
        action: AlertAuditAction.CREATE,
        outcome: 'unknown',
        savedObject: { type: 'alert', id },
      })
    );

    let createdAlert: SavedObject<RawAlert>;
    try {
      createdAlert = await this.unsecuredSavedObjectsClient.create(
        'alert',
        this.updateMeta(rawAlert),
        {
          ...options,
          references,
          id,
        }
      );
    } catch (e) {
      // Avoid unused API key
      markApiKeyForInvalidation(
        { apiKey: rawAlert.apiKey },
        this.logger,
        this.unsecuredSavedObjectsClient
      );
      throw e;
    }
    if (data.enabled) {
      let scheduledTask;
      try {
        scheduledTask = await this.scheduleAlert(
          createdAlert.id,
          rawAlert.alertTypeId,
          data.schedule
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
      await this.unsecuredSavedObjectsClient.update<RawAlert>('alert', createdAlert.id, {
        scheduledTaskId: scheduledTask.id,
      });
      createdAlert.attributes.scheduledTaskId = scheduledTask.id;
    }
    return this.getAlertFromRaw<Params>(createdAlert.id, createdAlert.attributes, references);
  }

  public async get<Params extends AlertTypeParams = never>({
    id,
  }: {
    id: string;
  }): Promise<SanitizedAlert<Params>> {
    const result = await this.unsecuredSavedObjectsClient.get<RawAlert>('alert', id);
    try {
      await this.authorization.ensureAuthorized(
        result.attributes.alertTypeId,
        result.attributes.consumer,
        ReadOperations.Get
      );
    } catch (error) {
      this.auditLogger?.log(
        alertAuditEvent({
          action: AlertAuditAction.GET,
          savedObject: { type: 'alert', id },
          error,
        })
      );
      throw error;
    }
    this.auditLogger?.log(
      alertAuditEvent({
        action: AlertAuditAction.GET,
        savedObject: { type: 'alert', id },
      })
    );
    return this.getAlertFromRaw<Params>(result.id, result.attributes, result.references);
  }

  public async getAlertState({ id }: { id: string }): Promise<AlertTaskState | void> {
    const alert = await this.get({ id });
    await this.authorization.ensureAuthorized(
      alert.alertTypeId,
      alert.consumer,
      ReadOperations.GetAlertState
    );
    if (alert.scheduledTaskId) {
      const { state } = taskInstanceToAlertTaskInstance(
        await this.taskManager.get(alert.scheduledTaskId),
        alert
      );
      return state;
    }
  }

  public async getAlertInstanceSummary({
    id,
    dateStart,
  }: GetAlertInstanceSummaryParams): Promise<AlertInstanceSummary> {
    this.logger.debug(`getAlertInstanceSummary(): getting alert ${id}`);
    const alert = await this.get({ id });
    await this.authorization.ensureAuthorized(
      alert.alertTypeId,
      alert.consumer,
      ReadOperations.GetAlertInstanceSummary
    );

    // default duration of instance summary is 60 * alert interval
    const dateNow = new Date();
    const durationMillis = parseDuration(alert.schedule.interval) * 60;
    const defaultDateStart = new Date(dateNow.valueOf() - durationMillis);
    const parsedDateStart = parseDate(dateStart, 'dateStart', defaultDateStart);

    const eventLogClient = await this.getEventLogClient();

    this.logger.debug(`getAlertInstanceSummary(): search the event log for alert ${id}`);
    let events: IEvent[];
    try {
      const queryResults = await eventLogClient.findEventsBySavedObjectIds('alert', [id], {
        page: 1,
        per_page: 10000,
        start: parsedDateStart.toISOString(),
        end: dateNow.toISOString(),
        sort_order: 'desc',
      });
      events = queryResults.data;
    } catch (err) {
      this.logger.debug(
        `alertsClient.getAlertInstanceSummary(): error searching event log for alert ${id}: ${err.message}`
      );
      events = [];
    }

    return alertInstanceSummaryFromEventLog({
      alert,
      events,
      dateStart: parsedDateStart.toISOString(),
      dateEnd: dateNow.toISOString(),
    });
  }

  public async find<Params extends AlertTypeParams = never>({
    options: { fields, ...options } = {},
  }: { options?: FindOptions } = {}): Promise<FindResult<Params>> {
    let authorizationTuple;
    try {
      authorizationTuple = await this.authorization.getFindAuthorizationFilter();
    } catch (error) {
      this.auditLogger?.log(
        alertAuditEvent({
          action: AlertAuditAction.FIND,
          error,
        })
      );
      throw error;
    }
    const {
      filter: authorizationFilter,
      ensureAlertTypeIsAuthorized,
      logSuccessfulAuthorization,
    } = authorizationTuple;

    const {
      page,
      per_page: perPage,
      total,
      saved_objects: data,
    } = await this.unsecuredSavedObjectsClient.find<RawAlert>({
      ...options,
      sortField: mapSortField(options.sortField),
      filter:
        (authorizationFilter && options.filter
          ? nodeBuilder.and([esKuery.fromKueryExpression(options.filter), authorizationFilter])
          : authorizationFilter) ?? options.filter,
      fields: fields ? this.includeFieldsRequiredForAuthentication(fields) : fields,
      type: 'alert',
    });

    const authorizedData = data.map(({ id, attributes, references }) => {
      try {
        ensureAlertTypeIsAuthorized(attributes.alertTypeId, attributes.consumer);
      } catch (error) {
        this.auditLogger?.log(
          alertAuditEvent({
            action: AlertAuditAction.FIND,
            savedObject: { type: 'alert', id },
            error,
          })
        );
        throw error;
      }
      return this.getAlertFromRaw<Params>(
        id,
        fields ? (pick(attributes, fields) as RawAlert) : attributes,
        references
      );
    });

    authorizedData.forEach(({ id }) =>
      this.auditLogger?.log(
        alertAuditEvent({
          action: AlertAuditAction.FIND,
          savedObject: { type: 'alert', id },
        })
      )
    );

    logSuccessfulAuthorization();

    return {
      page,
      perPage,
      total,
      data: authorizedData,
    };
  }

  public async aggregate({
    options: { fields, ...options } = {},
  }: { options?: AggregateOptions } = {}): Promise<AggregateResult> {
    // Replace this when saved objects supports aggregations https://github.com/elastic/kibana/pull/64002
    const alertExecutionStatus = await Promise.all(
      AlertExecutionStatusValues.map(async (status: string) => {
        const {
          filter: authorizationFilter,
          logSuccessfulAuthorization,
        } = await this.authorization.getFindAuthorizationFilter();
        const filter = options.filter
          ? `${options.filter} and alert.attributes.executionStatus.status:(${status})`
          : `alert.attributes.executionStatus.status:(${status})`;
        const { total } = await this.unsecuredSavedObjectsClient.find<RawAlert>({
          ...options,
          filter:
            (authorizationFilter && filter
              ? nodeBuilder.and([esKuery.fromKueryExpression(filter), authorizationFilter])
              : authorizationFilter) ?? filter,
          page: 1,
          perPage: 0,
          type: 'alert',
        });

        logSuccessfulAuthorization();

        return { [status]: total };
      })
    );

    return {
      alertExecutionStatus: alertExecutionStatus.reduce(
        (acc, curr: { [status: string]: number }) => Object.assign(acc, curr),
        {}
      ),
    };
  }

  public async delete({ id }: { id: string }) {
    let taskIdToRemove: string | undefined | null;
    let apiKeyToInvalidate: string | null = null;
    let attributes: RawAlert;

    try {
      const decryptedAlert = await this.encryptedSavedObjectsClient.getDecryptedAsInternalUser<RawAlert>(
        'alert',
        id,
        { namespace: this.namespace }
      );
      apiKeyToInvalidate = decryptedAlert.attributes.apiKey;
      taskIdToRemove = decryptedAlert.attributes.scheduledTaskId;
      attributes = decryptedAlert.attributes;
    } catch (e) {
      // We'll skip invalidating the API key since we failed to load the decrypted saved object
      this.logger.error(
        `delete(): Failed to load API key to invalidate on alert ${id}: ${e.message}`
      );
      // Still attempt to load the scheduledTaskId using SOC
      const alert = await this.unsecuredSavedObjectsClient.get<RawAlert>('alert', id);
      taskIdToRemove = alert.attributes.scheduledTaskId;
      attributes = alert.attributes;
    }

    try {
      await this.authorization.ensureAuthorized(
        attributes.alertTypeId,
        attributes.consumer,
        WriteOperations.Delete
      );
    } catch (error) {
      this.auditLogger?.log(
        alertAuditEvent({
          action: AlertAuditAction.DELETE,
          savedObject: { type: 'alert', id },
          error,
        })
      );
      throw error;
    }

    this.auditLogger?.log(
      alertAuditEvent({
        action: AlertAuditAction.DELETE,
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

  public async update<Params extends AlertTypeParams = never>({
    id,
    data,
  }: UpdateOptions<Params>): Promise<PartialAlert<Params>> {
    return await retryIfConflicts(
      this.logger,
      `alertsClient.update('${id}')`,
      async () => await this.updateWithOCC<Params>({ id, data })
    );
  }

  private async updateWithOCC<Params extends AlertTypeParams>({
    id,
    data,
  }: UpdateOptions<Params>): Promise<PartialAlert<Params>> {
    let alertSavedObject: SavedObject<RawAlert>;

    try {
      alertSavedObject = await this.encryptedSavedObjectsClient.getDecryptedAsInternalUser<RawAlert>(
        'alert',
        id,
        { namespace: this.namespace }
      );
    } catch (e) {
      // We'll skip invalidating the API key since we failed to load the decrypted saved object
      this.logger.error(
        `update(): Failed to load API key to invalidate on alert ${id}: ${e.message}`
      );
      // Still attempt to load the object using SOC
      alertSavedObject = await this.unsecuredSavedObjectsClient.get<RawAlert>('alert', id);
    }

    try {
      await this.authorization.ensureAuthorized(
        alertSavedObject.attributes.alertTypeId,
        alertSavedObject.attributes.consumer,
        WriteOperations.Update
      );
    } catch (error) {
      this.auditLogger?.log(
        alertAuditEvent({
          action: AlertAuditAction.UPDATE,
          savedObject: { type: 'alert', id },
          error,
        })
      );
      throw error;
    }

    this.auditLogger?.log(
      alertAuditEvent({
        action: AlertAuditAction.UPDATE,
        outcome: 'unknown',
        savedObject: { type: 'alert', id },
      })
    );

    this.alertTypeRegistry.ensureAlertTypeEnabled(alertSavedObject.attributes.alertTypeId);

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

  private async updateAlert<Params extends AlertTypeParams>(
    { id, data }: UpdateOptions<Params>,
    { attributes, version }: SavedObject<RawAlert>
  ): Promise<PartialAlert<Params>> {
    const alertType = this.alertTypeRegistry.get(attributes.alertTypeId);

    // Validate
    const validatedAlertTypeParams = validateAlertTypeParams(
      data.params,
      alertType.validate?.params
    );
    await this.validateActions(alertType, data.actions);

    const { actions, references } = await this.denormalizeActions(data.actions);
    const username = await this.getUserName();

    let createdAPIKey = null;
    try {
      createdAPIKey = attributes.enabled
        ? await this.createAPIKey(this.generateAPIKeyName(alertType.id, data.name))
        : null;
    } catch (error) {
      throw Boom.badRequest(`Error updating rule: could not create API key - ${error.message}`);
    }

    const apiKeyAttributes = this.apiKeyAsAlertAttributes(createdAPIKey, username);
    const notifyWhen = getAlertNotifyWhenType(data.notifyWhen, data.throttle);

    let updatedObject: SavedObject<RawAlert>;
    const createAttributes = this.updateMeta({
      ...attributes,
      ...data,
      ...apiKeyAttributes,
      params: validatedAlertTypeParams as RawAlert['params'],
      actions,
      notifyWhen,
      updatedBy: username,
      updatedAt: new Date().toISOString(),
    });
    try {
      updatedObject = await this.unsecuredSavedObjectsClient.create<RawAlert>(
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

    return this.getPartialAlertFromRaw(id, updatedObject.attributes, updatedObject.references);
  }

  private apiKeyAsAlertAttributes(
    apiKey: CreateAPIKeyResult | null,
    username: string | null
  ): Pick<RawAlert, 'apiKey' | 'apiKeyOwner'> {
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
      `alertsClient.updateApiKey('${id}')`,
      async () => await this.updateApiKeyWithOCC({ id })
    );
  }

  private async updateApiKeyWithOCC({ id }: { id: string }) {
    let apiKeyToInvalidate: string | null = null;
    let attributes: RawAlert;
    let version: string | undefined;

    try {
      const decryptedAlert = await this.encryptedSavedObjectsClient.getDecryptedAsInternalUser<RawAlert>(
        'alert',
        id,
        { namespace: this.namespace }
      );
      apiKeyToInvalidate = decryptedAlert.attributes.apiKey;
      attributes = decryptedAlert.attributes;
      version = decryptedAlert.version;
    } catch (e) {
      // We'll skip invalidating the API key since we failed to load the decrypted saved object
      this.logger.error(
        `updateApiKey(): Failed to load API key to invalidate on alert ${id}: ${e.message}`
      );
      // Still attempt to load the attributes and version using SOC
      const alert = await this.unsecuredSavedObjectsClient.get<RawAlert>('alert', id);
      attributes = alert.attributes;
      version = alert.version;
    }

    try {
      await this.authorization.ensureAuthorized(
        attributes.alertTypeId,
        attributes.consumer,
        WriteOperations.UpdateApiKey
      );
      if (attributes.actions.length) {
        await this.actionsAuthorization.ensureAuthorized('execute');
      }
    } catch (error) {
      this.auditLogger?.log(
        alertAuditEvent({
          action: AlertAuditAction.UPDATE_API_KEY,
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
      alertAuditEvent({
        action: AlertAuditAction.UPDATE_API_KEY,
        outcome: 'unknown',
        savedObject: { type: 'alert', id },
      })
    );

    this.alertTypeRegistry.ensureAlertTypeEnabled(attributes.alertTypeId);

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
      `alertsClient.enable('${id}')`,
      async () => await this.enableWithOCC({ id })
    );
  }

  private async enableWithOCC({ id }: { id: string }) {
    let apiKeyToInvalidate: string | null = null;
    let attributes: RawAlert;
    let version: string | undefined;

    try {
      const decryptedAlert = await this.encryptedSavedObjectsClient.getDecryptedAsInternalUser<RawAlert>(
        'alert',
        id,
        { namespace: this.namespace }
      );
      apiKeyToInvalidate = decryptedAlert.attributes.apiKey;
      attributes = decryptedAlert.attributes;
      version = decryptedAlert.version;
    } catch (e) {
      // We'll skip invalidating the API key since we failed to load the decrypted saved object
      this.logger.error(
        `enable(): Failed to load API key to invalidate on alert ${id}: ${e.message}`
      );
      // Still attempt to load the attributes and version using SOC
      const alert = await this.unsecuredSavedObjectsClient.get<RawAlert>('alert', id);
      attributes = alert.attributes;
      version = alert.version;
    }

    try {
      await this.authorization.ensureAuthorized(
        attributes.alertTypeId,
        attributes.consumer,
        WriteOperations.Enable
      );

      if (attributes.actions.length) {
        await this.actionsAuthorization.ensureAuthorized('execute');
      }
    } catch (error) {
      this.auditLogger?.log(
        alertAuditEvent({
          action: AlertAuditAction.ENABLE,
          savedObject: { type: 'alert', id },
          error,
        })
      );
      throw error;
    }

    this.auditLogger?.log(
      alertAuditEvent({
        action: AlertAuditAction.ENABLE,
        outcome: 'unknown',
        savedObject: { type: 'alert', id },
      })
    );

    this.alertTypeRegistry.ensureAlertTypeEnabled(attributes.alertTypeId);

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
          lastExecutionDate: new Date().toISOString(),
          error: null,
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
      const scheduledTask = await this.scheduleAlert(
        id,
        attributes.alertTypeId,
        attributes.schedule as IntervalSchedule
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
      `alertsClient.disable('${id}')`,
      async () => await this.disableWithOCC({ id })
    );
  }

  private async disableWithOCC({ id }: { id: string }) {
    let apiKeyToInvalidate: string | null = null;
    let attributes: RawAlert;
    let version: string | undefined;

    try {
      const decryptedAlert = await this.encryptedSavedObjectsClient.getDecryptedAsInternalUser<RawAlert>(
        'alert',
        id,
        { namespace: this.namespace }
      );
      apiKeyToInvalidate = decryptedAlert.attributes.apiKey;
      attributes = decryptedAlert.attributes;
      version = decryptedAlert.version;
    } catch (e) {
      // We'll skip invalidating the API key since we failed to load the decrypted saved object
      this.logger.error(
        `disable(): Failed to load API key to invalidate on alert ${id}: ${e.message}`
      );
      // Still attempt to load the attributes and version using SOC
      const alert = await this.unsecuredSavedObjectsClient.get<RawAlert>('alert', id);
      attributes = alert.attributes;
      version = alert.version;
    }

    try {
      await this.authorization.ensureAuthorized(
        attributes.alertTypeId,
        attributes.consumer,
        WriteOperations.Disable
      );
    } catch (error) {
      this.auditLogger?.log(
        alertAuditEvent({
          action: AlertAuditAction.DISABLE,
          savedObject: { type: 'alert', id },
          error,
        })
      );
      throw error;
    }

    this.auditLogger?.log(
      alertAuditEvent({
        action: AlertAuditAction.DISABLE,
        outcome: 'unknown',
        savedObject: { type: 'alert', id },
      })
    );

    this.alertTypeRegistry.ensureAlertTypeEnabled(attributes.alertTypeId);

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

  public async muteAll({ id }: { id: string }): Promise<void> {
    return await retryIfConflicts(
      this.logger,
      `alertsClient.muteAll('${id}')`,
      async () => await this.muteAllWithOCC({ id })
    );
  }

  private async muteAllWithOCC({ id }: { id: string }) {
    const { attributes, version } = await this.unsecuredSavedObjectsClient.get<RawAlert>(
      'alert',
      id
    );

    try {
      await this.authorization.ensureAuthorized(
        attributes.alertTypeId,
        attributes.consumer,
        WriteOperations.MuteAll
      );

      if (attributes.actions.length) {
        await this.actionsAuthorization.ensureAuthorized('execute');
      }
    } catch (error) {
      this.auditLogger?.log(
        alertAuditEvent({
          action: AlertAuditAction.MUTE,
          savedObject: { type: 'alert', id },
          error,
        })
      );
      throw error;
    }

    this.auditLogger?.log(
      alertAuditEvent({
        action: AlertAuditAction.MUTE,
        outcome: 'unknown',
        savedObject: { type: 'alert', id },
      })
    );

    this.alertTypeRegistry.ensureAlertTypeEnabled(attributes.alertTypeId);

    const updateAttributes = this.updateMeta({
      muteAll: true,
      mutedInstanceIds: [],
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
      `alertsClient.unmuteAll('${id}')`,
      async () => await this.unmuteAllWithOCC({ id })
    );
  }

  private async unmuteAllWithOCC({ id }: { id: string }) {
    const { attributes, version } = await this.unsecuredSavedObjectsClient.get<RawAlert>(
      'alert',
      id
    );

    try {
      await this.authorization.ensureAuthorized(
        attributes.alertTypeId,
        attributes.consumer,
        WriteOperations.UnmuteAll
      );

      if (attributes.actions.length) {
        await this.actionsAuthorization.ensureAuthorized('execute');
      }
    } catch (error) {
      this.auditLogger?.log(
        alertAuditEvent({
          action: AlertAuditAction.UNMUTE,
          savedObject: { type: 'alert', id },
          error,
        })
      );
      throw error;
    }

    this.auditLogger?.log(
      alertAuditEvent({
        action: AlertAuditAction.UNMUTE,
        outcome: 'unknown',
        savedObject: { type: 'alert', id },
      })
    );

    this.alertTypeRegistry.ensureAlertTypeEnabled(attributes.alertTypeId);

    const updateAttributes = this.updateMeta({
      muteAll: false,
      mutedInstanceIds: [],
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
      `alertsClient.muteInstance('${alertId}')`,
      async () => await this.muteInstanceWithOCC({ alertId, alertInstanceId })
    );
  }

  private async muteInstanceWithOCC({ alertId, alertInstanceId }: MuteOptions) {
    const { attributes, version } = await this.unsecuredSavedObjectsClient.get<Alert>(
      'alert',
      alertId
    );

    try {
      await this.authorization.ensureAuthorized(
        attributes.alertTypeId,
        attributes.consumer,
        WriteOperations.MuteInstance
      );

      if (attributes.actions.length) {
        await this.actionsAuthorization.ensureAuthorized('execute');
      }
    } catch (error) {
      this.auditLogger?.log(
        alertAuditEvent({
          action: AlertAuditAction.MUTE_INSTANCE,
          savedObject: { type: 'alert', id: alertId },
          error,
        })
      );
      throw error;
    }

    this.auditLogger?.log(
      alertAuditEvent({
        action: AlertAuditAction.MUTE_INSTANCE,
        outcome: 'unknown',
        savedObject: { type: 'alert', id: alertId },
      })
    );

    this.alertTypeRegistry.ensureAlertTypeEnabled(attributes.alertTypeId);

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
      `alertsClient.unmuteInstance('${alertId}')`,
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
    const { attributes, version } = await this.unsecuredSavedObjectsClient.get<Alert>(
      'alert',
      alertId
    );

    try {
      await this.authorization.ensureAuthorized(
        attributes.alertTypeId,
        attributes.consumer,
        WriteOperations.UnmuteInstance
      );
      if (attributes.actions.length) {
        await this.actionsAuthorization.ensureAuthorized('execute');
      }
    } catch (error) {
      this.auditLogger?.log(
        alertAuditEvent({
          action: AlertAuditAction.UNMUTE_INSTANCE,
          savedObject: { type: 'alert', id: alertId },
          error,
        })
      );
      throw error;
    }

    this.auditLogger?.log(
      alertAuditEvent({
        action: AlertAuditAction.UNMUTE_INSTANCE,
        outcome: 'unknown',
        savedObject: { type: 'alert', id: alertId },
      })
    );

    this.alertTypeRegistry.ensureAlertTypeEnabled(attributes.alertTypeId);

    const mutedInstanceIds = attributes.mutedInstanceIds || [];
    if (!attributes.muteAll && mutedInstanceIds.includes(alertInstanceId)) {
      await this.unsecuredSavedObjectsClient.update<RawAlert>(
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
    return await this.authorization.filterByAlertTypeAuthorization(this.alertTypeRegistry.list(), [
      ReadOperations.Get,
      WriteOperations.Create,
    ]);
  }

  private async scheduleAlert(id: string, alertTypeId: string, schedule: IntervalSchedule) {
    return await this.taskManager.schedule({
      taskType: `alerting:${alertTypeId}`,
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
    });
  }

  private injectReferencesIntoActions(
    alertId: string,
    actions: RawAlert['actions'],
    references: SavedObjectReference[]
  ) {
    return actions.map((action) => {
      const reference = references.find((ref) => ref.name === action.actionRef);
      if (!reference) {
        throw new Error(`Action reference "${action.actionRef}" not found in alert id: ${alertId}`);
      }
      return {
        ...omit(action, 'actionRef'),
        id: reference.id,
      };
    }) as Alert['actions'];
  }

  private getAlertFromRaw<Params extends AlertTypeParams>(
    id: string,
    rawAlert: RawAlert,
    references: SavedObjectReference[] | undefined
  ): Alert {
    // In order to support the partial update API of Saved Objects we have to support
    // partial updates of an Alert, but when we receive an actual RawAlert, it is safe
    // to cast the result to an Alert
    return this.getPartialAlertFromRaw<Params>(id, rawAlert, references) as Alert;
  }

  private getPartialAlertFromRaw<Params extends AlertTypeParams>(
    id: string,
    { createdAt, updatedAt, meta, notifyWhen, scheduledTaskId, ...rawAlert }: Partial<RawAlert>,
    references: SavedObjectReference[] | undefined
  ): PartialAlert<Params> {
    // Not the prettiest code here, but if we want to use most of the
    // alert fields from the rawAlert using `...rawAlert` kind of access, we
    // need to specifically delete the executionStatus as it's a different type
    // in RawAlert and Alert.  Probably next time we need to do something similar
    // here, we should look at redesigning the implementation of this method.
    const rawAlertWithoutExecutionStatus: Partial<Omit<RawAlert, 'executionStatus'>> = {
      ...rawAlert,
    };
    delete rawAlertWithoutExecutionStatus.executionStatus;
    const executionStatus = alertExecutionStatusFromRaw(this.logger, id, rawAlert.executionStatus);
    return {
      id,
      notifyWhen,
      ...rawAlertWithoutExecutionStatus,
      // we currently only support the Interval Schedule type
      // Once we support additional types, this type signature will likely change
      schedule: rawAlert.schedule as IntervalSchedule,
      actions: rawAlert.actions
        ? this.injectReferencesIntoActions(id, rawAlert.actions, references || [])
        : [],
      ...(updatedAt ? { updatedAt: new Date(updatedAt) } : {}),
      ...(createdAt ? { createdAt: new Date(createdAt) } : {}),
      ...(scheduledTaskId ? { scheduledTaskId } : {}),
      ...(executionStatus ? { executionStatus } : {}),
    };
  }

  private async validateActions(
    alertType: UntypedNormalizedAlertType,
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
        i18n.translate('xpack.alerting.alertsClient.validateActions.misconfiguredConnector', {
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
        i18n.translate('xpack.alerting.alertsClient.validateActions.invalidGroups', {
          defaultMessage: 'Invalid action groups: {groups}',
          values: {
            groups: invalidActionGroups.join(', '),
          },
        })
      );
    }
  }

  private async denormalizeActions(
    alertActions: NormalizedAlertAction[]
  ): Promise<{ actions: RawAlert['actions']; references: SavedObjectReference[] }> {
    const references: SavedObjectReference[] = [];
    const actions: RawAlert['actions'] = [];
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

  private updateMeta<T extends Partial<RawAlert>>(alertAttributes: T): T {
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
      i18n.translate('xpack.alerting.alertsClient.invalidDate', {
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
