/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { omit, isEqual, pluck, mapValues } from 'lodash';
import { i18n } from '@kbn/i18n';
import {
  Logger,
  SavedObjectsClientContract,
  SavedObjectReference,
  SavedObject,
  KibanaRequest,
} from 'src/core/server';
import { ActionsClient } from '../../actions/server';
import { AlertsFeatureId } from '../common';
import {
  Alert,
  PartialAlert,
  RawAlert,
  AlertTypeRegistry,
  AlertAction,
  AlertType,
  IntervalSchedule,
  SanitizedAlert,
  AlertTaskState,
} from './types';
import { validateAlertTypeParams } from './lib';
import {
  InvalidateAPIKeyParams,
  GrantAPIKeyResult as SecurityPluginGrantAPIKeyResult,
  InvalidateAPIKeyResult as SecurityPluginInvalidateAPIKeyResult,
  SecurityPluginSetup,
} from '../../security/server';
import { EncryptedSavedObjectsClient } from '../../encrypted_saved_objects/server';
import { TaskManagerStartContract } from '../../task_manager/server';
import { taskInstanceToAlertTaskInstance } from './task_runner/alert_task_instance';
import { deleteTaskIfItExists } from './lib/delete_task_if_it_exists';
import { RegistryAlertType } from './alert_type_registry';
import { PluginStartContract as FeaturesPluginStart } from '../../features/server';

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

interface ConstructorOptions {
  logger: Logger;
  taskManager: TaskManagerStartContract;
  unsecuredSavedObjectsClient: SavedObjectsClientContract;
  authorization?: SecurityPluginSetup['authz'];
  request: KibanaRequest;
  alertTypeRegistry: AlertTypeRegistry;
  encryptedSavedObjectsClient: EncryptedSavedObjectsClient;
  spaceId?: string;
  namespace?: string;
  features: FeaturesPluginStart;
  getUserName: () => Promise<string | null>;
  createAPIKey: () => Promise<CreateAPIKeyResult>;
  invalidateAPIKey: (params: InvalidateAPIKeyParams) => Promise<InvalidateAPIKeyResult>;
  getActionsClient: () => Promise<ActionsClient>;
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
  sortOrder?: string;
  hasReference?: {
    type: string;
    id: string;
  };
  fields?: string[];
  filter?: string;
}

interface IndexType {
  [key: string]: unknown;
}

export interface FindResult {
  page: number;
  perPage: number;
  total: number;
  data: SanitizedAlert[];
}

export interface CreateOptions {
  data: Omit<
    Alert,
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
  > & { actions: NormalizedAlertAction[] };
  options?: {
    migrationVersion?: Record<string, string>;
  };
}

export interface UpdateOptions {
  id: string;
  data: {
    name: string;
    tags: string[];
    schedule: IntervalSchedule;
    actions: NormalizedAlertAction[];
    params: Record<string, unknown>;
    throttle: string | null;
  };
}

export class AlertsClient {
  private readonly logger: Logger;
  private readonly getUserName: () => Promise<string | null>;
  private readonly features: FeaturesPluginStart;
  private readonly spaceId?: string;
  private readonly namespace?: string;
  private readonly taskManager: TaskManagerStartContract;
  private readonly unsecuredSavedObjectsClient: SavedObjectsClientContract;
  private readonly request: KibanaRequest;
  private readonly authorization?: SecurityPluginSetup['authz'];
  private readonly alertTypeRegistry: AlertTypeRegistry;
  private readonly createAPIKey: () => Promise<CreateAPIKeyResult>;
  private readonly invalidateAPIKey: (
    params: InvalidateAPIKeyParams
  ) => Promise<InvalidateAPIKeyResult>;
  private readonly getActionsClient: () => Promise<ActionsClient>;
  encryptedSavedObjectsClient: EncryptedSavedObjectsClient;

  constructor({
    alertTypeRegistry,
    unsecuredSavedObjectsClient,
    request,
    authorization,
    taskManager,
    logger,
    spaceId,
    namespace,
    getUserName,
    createAPIKey,
    invalidateAPIKey,
    encryptedSavedObjectsClient,
    getActionsClient,
    features,
  }: ConstructorOptions) {
    this.logger = logger;
    this.getUserName = getUserName;
    this.spaceId = spaceId;
    this.namespace = namespace;
    this.taskManager = taskManager;
    this.alertTypeRegistry = alertTypeRegistry;
    this.unsecuredSavedObjectsClient = unsecuredSavedObjectsClient;
    this.request = request;
    this.authorization = authorization;
    this.createAPIKey = createAPIKey;
    this.invalidateAPIKey = invalidateAPIKey;
    this.encryptedSavedObjectsClient = encryptedSavedObjectsClient;
    this.getActionsClient = getActionsClient;
    this.features = features;
  }

  public async create({ data, options }: CreateOptions): Promise<Alert> {
    // Throws an error if alert type isn't registered
    await this.ensureAuthorized(data.alertTypeId, data.consumer, 'create');
    const alertType = this.alertTypeRegistry.get(data.alertTypeId);
    const validatedAlertTypeParams = validateAlertTypeParams(alertType, data.params);
    const username = await this.getUserName();
    const createdAPIKey = data.enabled ? await this.createAPIKey() : null;

    this.validateActions(alertType, data.actions);

    const { references, actions } = await this.denormalizeActions(data.actions);
    const rawAlert: RawAlert = {
      ...data,
      ...this.apiKeyAsAlertAttributes(createdAPIKey, username),
      actions,
      createdBy: username,
      updatedBy: username,
      createdAt: new Date().toISOString(),
      params: validatedAlertTypeParams as RawAlert['params'],
      muteAll: false,
      mutedInstanceIds: [],
    };
    const createdAlert = await this.unsecuredSavedObjectsClient.create('alert', rawAlert, {
      ...options,
      references,
    });
    if (data.enabled) {
      let scheduledTask;
      try {
        scheduledTask = await this.scheduleAlert(createdAlert.id, rawAlert.alertTypeId);
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
      await this.unsecuredSavedObjectsClient.update('alert', createdAlert.id, {
        scheduledTaskId: scheduledTask.id,
      });
      createdAlert.attributes.scheduledTaskId = scheduledTask.id;
    }
    return this.getAlertFromRaw(
      createdAlert.id,
      createdAlert.attributes,
      createdAlert.updated_at,
      references
    );
  }

  public async get({ id }: { id: string }): Promise<SanitizedAlert> {
    const result = await this.unsecuredSavedObjectsClient.get<RawAlert>('alert', id);
    await this.ensureAuthorized(result.attributes.alertTypeId, result.attributes.consumer, 'get');
    return this.getAlertFromRaw(result.id, result.attributes, result.updated_at, result.references);
  }

  public async getAlertState({ id }: { id: string }): Promise<AlertTaskState | void> {
    const alert = await this.get({ id });
    if (alert.scheduledTaskId) {
      const { state } = taskInstanceToAlertTaskInstance(
        await this.taskManager.get(alert.scheduledTaskId),
        alert
      );
      return state;
    }
  }

  public async find({
    options: { filter, ...options } = {},
  }: { options?: FindOptions } = {}): Promise<FindResult> {
    const filters = filter ? [filter] : [];

    const authorizedAlertTypes = await this.filterByAuthorized(
      this.alertTypeRegistry.list(),
      'find'
    );
    const authorizedAlertTypeIds = new Set(pluck([...authorizedAlertTypes], 'id'));

    if (!authorizedAlertTypes.size) {
      // the current user isn't authorized to get any alertTypes
      // we can short circuit here
      return {
        page: 0,
        perPage: 0,
        total: 0,
        data: [],
      };
    }

    filters.push(`(${asFiltersByAlertTypeAndConsumer(authorizedAlertTypes).join(' or ')})`);

    const {
      page,
      per_page: perPage,
      total,
      saved_objects: data,
    } = await this.unsecuredSavedObjectsClient.find<RawAlert>({
      ...options,
      filter: filters.join(` and `),
      type: 'alert',
    });

    return {
      page,
      perPage,
      total,
      data: data.map(({ id, attributes, updated_at, references }) => {
        if (!authorizedAlertTypeIds.has(attributes.alertTypeId)) {
          throw Boom.forbidden(`Unauthorized to find "${attributes.alertTypeId}" alerts`);
        }
        return this.getAlertFromRaw(id, attributes, updated_at, references);
      }),
    };
  }

  public async delete({ id }: { id: string }) {
    let taskIdToRemove: string | undefined;
    let apiKeyToInvalidate: string | null = null;
    let attributes: RawAlert;

    try {
      const decryptedAlert = await this.encryptedSavedObjectsClient.getDecryptedAsInternalUser<
        RawAlert
      >('alert', id, { namespace: this.namespace });
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

    await this.ensureAuthorized(attributes.alertTypeId, attributes.consumer, 'delete');

    const removeResult = await this.unsecuredSavedObjectsClient.delete('alert', id);

    await Promise.all([
      taskIdToRemove ? deleteTaskIfItExists(this.taskManager, taskIdToRemove) : null,
      apiKeyToInvalidate ? this.invalidateApiKey({ apiKey: apiKeyToInvalidate }) : null,
    ]);

    return removeResult;
  }

  public async update({ id, data }: UpdateOptions): Promise<PartialAlert> {
    let alertSavedObject: SavedObject<RawAlert>;

    try {
      alertSavedObject = await this.encryptedSavedObjectsClient.getDecryptedAsInternalUser<
        RawAlert
      >('alert', id, { namespace: this.namespace });
    } catch (e) {
      // We'll skip invalidating the API key since we failed to load the decrypted saved object
      this.logger.error(
        `update(): Failed to load API key to invalidate on alert ${id}: ${e.message}`
      );
      // Still attempt to load the object using SOC
      alertSavedObject = await this.unsecuredSavedObjectsClient.get<RawAlert>('alert', id);
    }
    await this.ensureAuthorized(
      alertSavedObject.attributes.alertTypeId,
      alertSavedObject.attributes.consumer,
      'update'
    );

    const updateResult = await this.updateAlert({ id, data }, alertSavedObject);

    await Promise.all([
      alertSavedObject.attributes.apiKey
        ? this.invalidateApiKey({ apiKey: alertSavedObject.attributes.apiKey })
        : null,
      (async () => {
        if (
          updateResult.scheduledTaskId &&
          !isEqual(alertSavedObject.attributes.schedule, updateResult.schedule)
        ) {
          this.taskManager.runNow(updateResult.scheduledTaskId).catch((err: Error) => {
            this.logger.error(
              `Alert update failed to run its underlying task. TaskManager runNow failed with Error: ${err.message}`
            );
          });
        }
      })(),
    ]);

    return updateResult;
  }

  private async updateAlert(
    { id, data }: UpdateOptions,
    { attributes, version }: SavedObject<RawAlert>
  ): Promise<PartialAlert> {
    const alertType = this.alertTypeRegistry.get(attributes.alertTypeId);

    // Validate
    const validatedAlertTypeParams = validateAlertTypeParams(alertType, data.params);
    this.validateActions(alertType, data.actions);

    const { actions, references } = await this.denormalizeActions(data.actions);
    const username = await this.getUserName();
    const createdAPIKey = attributes.enabled ? await this.createAPIKey() : null;
    const apiKeyAttributes = this.apiKeyAsAlertAttributes(createdAPIKey, username);

    const updatedObject = await this.unsecuredSavedObjectsClient.update<RawAlert>(
      'alert',
      id,
      {
        ...attributes,
        ...data,
        ...apiKeyAttributes,
        params: validatedAlertTypeParams as RawAlert['params'],
        actions,
        updatedBy: username,
      },
      {
        version,
        references,
      }
    );

    return this.getPartialAlertFromRaw(
      id,
      updatedObject.attributes,
      updatedObject.updated_at,
      updatedObject.references
    );
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

  public async updateApiKey({ id }: { id: string }) {
    let apiKeyToInvalidate: string | null = null;
    let attributes: RawAlert;
    let version: string | undefined;

    try {
      const decryptedAlert = await this.encryptedSavedObjectsClient.getDecryptedAsInternalUser<
        RawAlert
      >('alert', id, { namespace: this.namespace });
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
    await this.ensureAuthorized(attributes.alertTypeId, attributes.consumer, 'updateApiKey');

    const username = await this.getUserName();
    await this.unsecuredSavedObjectsClient.update(
      'alert',
      id,
      {
        ...attributes,
        ...this.apiKeyAsAlertAttributes(await this.createAPIKey(), username),
        updatedBy: username,
      },
      { version }
    );

    if (apiKeyToInvalidate) {
      await this.invalidateApiKey({ apiKey: apiKeyToInvalidate });
    }
  }

  private async invalidateApiKey({ apiKey }: { apiKey: string | null }): Promise<void> {
    if (!apiKey) {
      return;
    }

    try {
      const apiKeyId = Buffer.from(apiKey, 'base64').toString().split(':')[0];
      const response = await this.invalidateAPIKey({ id: apiKeyId });
      if (response.apiKeysEnabled === true && response.result.error_count > 0) {
        this.logger.error(`Failed to invalidate API Key [id="${apiKeyId}"]`);
      }
    } catch (e) {
      this.logger.error(`Failed to invalidate API Key: ${e.message}`);
    }
  }

  public async enable({ id }: { id: string }) {
    let apiKeyToInvalidate: string | null = null;
    let attributes: RawAlert;
    let version: string | undefined;

    try {
      const decryptedAlert = await this.encryptedSavedObjectsClient.getDecryptedAsInternalUser<
        RawAlert
      >('alert', id, { namespace: this.namespace });
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

    await this.ensureAuthorized(attributes.alertTypeId, attributes.consumer, 'enable');

    if (attributes.enabled === false) {
      const username = await this.getUserName();
      await this.unsecuredSavedObjectsClient.update(
        'alert',
        id,
        {
          ...attributes,
          enabled: true,
          ...this.apiKeyAsAlertAttributes(await this.createAPIKey(), username),
          updatedBy: username,
        },
        { version }
      );
      const scheduledTask = await this.scheduleAlert(id, attributes.alertTypeId);
      await this.unsecuredSavedObjectsClient.update('alert', id, {
        scheduledTaskId: scheduledTask.id,
      });
      if (apiKeyToInvalidate) {
        await this.invalidateApiKey({ apiKey: apiKeyToInvalidate });
      }
    }
  }

  public async disable({ id }: { id: string }) {
    let apiKeyToInvalidate: string | null = null;
    let attributes: RawAlert;
    let version: string | undefined;

    try {
      const decryptedAlert = await this.encryptedSavedObjectsClient.getDecryptedAsInternalUser<
        RawAlert
      >('alert', id, { namespace: this.namespace });
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

    await this.ensureAuthorized(attributes.alertTypeId, attributes.consumer, 'disable');

    if (attributes.enabled === true) {
      await this.unsecuredSavedObjectsClient.update(
        'alert',
        id,
        {
          ...attributes,
          enabled: false,
          scheduledTaskId: null,
          apiKey: null,
          apiKeyOwner: null,
          updatedBy: await this.getUserName(),
        },
        { version }
      );

      await Promise.all([
        attributes.scheduledTaskId
          ? deleteTaskIfItExists(this.taskManager, attributes.scheduledTaskId)
          : null,
        apiKeyToInvalidate ? this.invalidateApiKey({ apiKey: apiKeyToInvalidate }) : null,
      ]);
    }
  }

  public async muteAll({ id }: { id: string }) {
    const { attributes } = await this.unsecuredSavedObjectsClient.get<RawAlert>('alert', id);
    await this.ensureAuthorized(attributes.alertTypeId, attributes.consumer, 'muteAll');

    await this.unsecuredSavedObjectsClient.update('alert', id, {
      muteAll: true,
      mutedInstanceIds: [],
      updatedBy: await this.getUserName(),
    });
  }

  public async unmuteAll({ id }: { id: string }) {
    const { attributes } = await this.unsecuredSavedObjectsClient.get<RawAlert>('alert', id);
    await this.ensureAuthorized(attributes.alertTypeId, attributes.consumer, 'unmuteAll');

    await this.unsecuredSavedObjectsClient.update('alert', id, {
      muteAll: false,
      mutedInstanceIds: [],
      updatedBy: await this.getUserName(),
    });
  }

  public async muteInstance({ alertId, alertInstanceId }: MuteOptions) {
    const { attributes, version } = await this.unsecuredSavedObjectsClient.get<Alert>(
      'alert',
      alertId
    );

    await this.ensureAuthorized(attributes.alertTypeId, attributes.consumer, 'muteInstance');

    const mutedInstanceIds = attributes.mutedInstanceIds || [];
    if (!attributes.muteAll && !mutedInstanceIds.includes(alertInstanceId)) {
      mutedInstanceIds.push(alertInstanceId);
      await this.unsecuredSavedObjectsClient.update(
        'alert',
        alertId,
        {
          mutedInstanceIds,
          updatedBy: await this.getUserName(),
        },
        { version }
      );
    }
  }

  public async unmuteInstance({
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
    await this.ensureAuthorized(attributes.alertTypeId, attributes.consumer, 'unmuteInstance');
    const mutedInstanceIds = attributes.mutedInstanceIds || [];
    if (!attributes.muteAll && mutedInstanceIds.includes(alertInstanceId)) {
      await this.unsecuredSavedObjectsClient.update(
        'alert',
        alertId,
        {
          updatedBy: await this.getUserName(),

          mutedInstanceIds: mutedInstanceIds.filter((id: string) => id !== alertInstanceId),
        },
        { version }
      );
    }
  }

  public async listAlertTypes() {
    return await this.filterByAuthorized(this.alertTypeRegistry.list(), 'get');
  }

  private async ensureAuthorized(alertTypeId: string, consumer: string, operation: string) {
    const { authorization } = this;
    if (authorization) {
      const alertType = this.alertTypeRegistry.get(alertTypeId);
      const requiredPrivilegesByScope = {
        consumer: authorization.actions.alerting.get(alertTypeId, consumer, operation),
        producer: authorization.actions.alerting.get(alertTypeId, alertType.producer, operation),
      };

      // We special case the Alerts Management `consumer` as we don't want to have to
      // manually authorize each alert type in the management UI
      const shouldAuthorizeConsumer = consumer !== AlertsFeatureId;

      const checkPrivileges = authorization.checkPrivilegesDynamicallyWithRequest(this.request);
      const { hasAllRequested, privileges } = await checkPrivileges(
        shouldAuthorizeConsumer && consumer !== alertType.producer
          ? [
              // check for access at consumer level
              requiredPrivilegesByScope.consumer,
              // check for access at producer level
              requiredPrivilegesByScope.producer,
            ]
          : [
              // skip consumer privilege checks under `alerts` as all alert types can
              // be created under `alerts` if you have producer level privileges
              requiredPrivilegesByScope.producer,
            ]
      );

      if (!hasAllRequested) {
        const authorizedPrivileges = pluck(
          privileges.filter((privilege) => privilege.authorized),
          'privilege'
        );
        const unauthorizedScopes = mapValues(
          requiredPrivilegesByScope,
          (privilege) => !authorizedPrivileges.includes(privilege)
        );

        throw Boom.forbidden(
          `Unauthorized to ${operation} a "${alertTypeId}" alert ${
            shouldAuthorizeConsumer && unauthorizedScopes.consumer
              ? `for "${consumer}"`
              : `by "${alertType.producer}"`
          }`
        );
      }
    }
  }

  private async filterByAuthorized(
    alertTypes: Set<RegistryAlertType>,
    operation: string
  ): Promise<Set<RegistryAlertTypeWithAuth>> {
    const featuresIds = this.features.getFeatures().map((feature) => feature.id);

    if (!this.authorization) {
      return augmentWithAuthorizedConsumers(alertTypes, featuresIds);
    } else {
      const checkPrivileges = this.authorization.checkPrivilegesDynamicallyWithRequest(
        this.request
      );

      // add an empty `authorizedConsumers` array on each alertType
      const alertTypesWithAutherization = augmentWithAuthorizedConsumers(alertTypes);

      // map from privilege to alertType which we can refer back to when analyzing the result
      // of checkPrivileges
      const privilegeToAlertType = new Map<string, [RegistryAlertTypeWithAuth, string]>();
      // as we can't ask ES for the user's individual privileges we need to ask for each feature
      // and alertType in the system whether this user has this privilege
      for (const alertType of alertTypesWithAutherization) {
        for (const feature of featuresIds) {
          privilegeToAlertType.set(
            this.authorization!.actions.alerting.get(alertType.id, feature, operation),
            [alertType, feature]
          );
        }
      }

      const { hasAllRequested, privileges } = await checkPrivileges([
        ...privilegeToAlertType.keys(),
      ]);

      return hasAllRequested
        ? // has access to all features
          augmentWithAuthorizedConsumers(alertTypes, featuresIds)
        : // only has some of the required privileges
          privileges.reduce((authorizedAlertTypes, { authorized, privilege }) => {
            if (authorized && privilegeToAlertType.has(privilege)) {
              const [alertType, consumer] = privilegeToAlertType.get(privilege)!;
              alertType.authorizedConsumers.push(consumer);
              authorizedAlertTypes.add(alertType);
            }
            return authorizedAlertTypes;
          }, new Set<RegistryAlertTypeWithAuth>());
    }
  }

  private async scheduleAlert(id: string, alertTypeId: string) {
    return await this.taskManager.schedule({
      taskType: `alerting:${alertTypeId}`,
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
    actions: RawAlert['actions'],
    references: SavedObjectReference[]
  ) {
    return actions.map((action) => {
      const reference = references.find((ref) => ref.name === action.actionRef);
      if (!reference) {
        throw new Error(`Reference ${action.actionRef} not found`);
      }
      return {
        ...omit(action, 'actionRef'),
        id: reference.id,
      };
    }) as Alert['actions'];
  }

  private getAlertFromRaw(
    id: string,
    rawAlert: RawAlert,
    updatedAt: SavedObject['updated_at'],
    references: SavedObjectReference[] | undefined
  ): Alert {
    // In order to support the partial update API of Saved Objects we have to support
    // partial updates of an Alert, but when we receive an actual RawAlert, it is safe
    // to cast the result to an Alert
    return this.getPartialAlertFromRaw(id, rawAlert, updatedAt, references) as Alert;
  }

  private getPartialAlertFromRaw(
    id: string,
    rawAlert: Partial<RawAlert>,
    updatedAt: SavedObject['updated_at'],
    references: SavedObjectReference[] | undefined
  ): PartialAlert {
    return {
      id,
      ...rawAlert,
      // we currently only support the Interval Schedule type
      // Once we support additional types, this type signature will likely change
      schedule: rawAlert.schedule as IntervalSchedule,
      updatedAt: updatedAt ? new Date(updatedAt) : new Date(rawAlert.createdAt!),
      createdAt: new Date(rawAlert.createdAt!),
      actions: rawAlert.actions
        ? this.injectReferencesIntoActions(rawAlert.actions, references || [])
        : [],
    };
  }

  private validateActions(alertType: AlertType, actions: NormalizedAlertAction[]): void {
    const { actionGroups: alertTypeActionGroups } = alertType;
    const usedAlertActionGroups = actions.map((action) => action.group);
    const availableAlertTypeActionGroups = new Set(pluck(alertTypeActionGroups, 'id'));
    const invalidActionGroups = usedAlertActionGroups.filter(
      (group) => !availableAlertTypeActionGroups.has(group)
    );
    if (invalidActionGroups.length) {
      throw Boom.badRequest(
        i18n.translate('xpack.alerts.alertsClient.validateActions.invalidGroups', {
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
    const actionsClient = await this.getActionsClient();
    const actionIds = [...new Set(alertActions.map((alertAction) => alertAction.id))];
    const actionResults = await actionsClient.getBulk(actionIds);
    const references: SavedObjectReference[] = [];
    const actions = alertActions.map(({ id, ...alertAction }, i) => {
      const actionResultValue = actionResults.find((action) => action.id === id);
      if (actionResultValue) {
        const actionRef = `action_${i}`;
        references.push({
          id,
          name: actionRef,
          type: 'action',
        });
        return {
          ...alertAction,
          actionRef,
          actionTypeId: actionResultValue.actionTypeId,
        };
      } else {
        return {
          ...alertAction,
          actionRef: '',
          actionTypeId: '',
        };
      }
    });
    return {
      actions,
      references,
    };
  }
}

function augmentWithAuthorizedConsumers(
  alertTypes: Set<RegistryAlertType>,
  authorizedConsumers?: string[]
): Set<RegistryAlertTypeWithAuth> {
  return new Set(
    Array.from(alertTypes).map((alertType) => ({
      ...alertType,
      authorizedConsumers: authorizedConsumers ?? [],
    }))
  );
}

function asFiltersByAlertTypeAndConsumer(alertTypes: Set<RegistryAlertTypeWithAuth>): string[] {
  return Array.from(alertTypes).reduce<string[]>((filters, { id, authorizedConsumers }) => {
    for (const consumer of authorizedConsumers) {
      filters.push(
        `(alert.attributes.alertTypeId:${id} and alert.attributes.consumer:${consumer})`
      );
    }
    return filters;
  }, []);
}
