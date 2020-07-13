/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { omit, isEqual, map } from 'lodash';
import { i18n } from '@kbn/i18n';
import {
  Logger,
  SavedObjectsClientContract,
  SavedObjectReference,
  SavedObject,
} from 'src/core/server';
import { ActionsClient } from '../../actions/server';
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
} from '../../security/server';
import { EncryptedSavedObjectsClient } from '../../encrypted_saved_objects/server';
import { TaskManagerStartContract } from '../../task_manager/server';
import { taskInstanceToAlertTaskInstance } from './task_runner/alert_task_instance';
import { deleteTaskIfItExists } from './lib/delete_task_if_it_exists';

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
  savedObjectsClient: SavedObjectsClientContract;
  alertTypeRegistry: AlertTypeRegistry;
  encryptedSavedObjectsClient: EncryptedSavedObjectsClient;
  spaceId?: string;
  namespace?: string;
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

interface UpdateOptions {
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
  private readonly spaceId?: string;
  private readonly namespace?: string;
  private readonly taskManager: TaskManagerStartContract;
  private readonly savedObjectsClient: SavedObjectsClientContract;
  private readonly alertTypeRegistry: AlertTypeRegistry;
  private readonly createAPIKey: () => Promise<CreateAPIKeyResult>;
  private readonly invalidateAPIKey: (
    params: InvalidateAPIKeyParams
  ) => Promise<InvalidateAPIKeyResult>;
  private readonly getActionsClient: () => Promise<ActionsClient>;
  encryptedSavedObjectsClient: EncryptedSavedObjectsClient;

  constructor({
    alertTypeRegistry,
    savedObjectsClient,
    taskManager,
    logger,
    spaceId,
    namespace,
    getUserName,
    createAPIKey,
    invalidateAPIKey,
    encryptedSavedObjectsClient,
    getActionsClient,
  }: ConstructorOptions) {
    this.logger = logger;
    this.getUserName = getUserName;
    this.spaceId = spaceId;
    this.namespace = namespace;
    this.taskManager = taskManager;
    this.alertTypeRegistry = alertTypeRegistry;
    this.savedObjectsClient = savedObjectsClient;
    this.createAPIKey = createAPIKey;
    this.invalidateAPIKey = invalidateAPIKey;
    this.encryptedSavedObjectsClient = encryptedSavedObjectsClient;
    this.getActionsClient = getActionsClient;
  }

  public async create({ data, options }: CreateOptions): Promise<Alert> {
    // Throws an error if alert type isn't registered
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
    const createdAlert = await this.savedObjectsClient.create('alert', rawAlert, {
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
          await this.savedObjectsClient.delete('alert', createdAlert.id);
        } catch (err) {
          // Skip the cleanup error and throw the task manager error to avoid confusion
          this.logger.error(
            `Failed to cleanup alert "${createdAlert.id}" after scheduling task failed. Error: ${err.message}`
          );
        }
        throw e;
      }
      await this.savedObjectsClient.update('alert', createdAlert.id, {
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
    const result = await this.savedObjectsClient.get<RawAlert>('alert', id);
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

  public async find({ options = {} }: { options: FindOptions }): Promise<FindResult> {
    const {
      page,
      per_page: perPage,
      total,
      saved_objects: data,
    } = await this.savedObjectsClient.find<RawAlert>({
      ...options,
      type: 'alert',
    });

    return {
      page,
      perPage,
      total,
      data: data.map(({ id, attributes, updated_at, references }) =>
        this.getAlertFromRaw(id, attributes, updated_at, references)
      ),
    };
  }

  public async delete({ id }: { id: string }) {
    let taskIdToRemove: string | undefined;
    let apiKeyToInvalidate: string | null = null;

    try {
      const decryptedAlert = await this.encryptedSavedObjectsClient.getDecryptedAsInternalUser<
        RawAlert
      >('alert', id, { namespace: this.namespace });
      apiKeyToInvalidate = decryptedAlert.attributes.apiKey;
      taskIdToRemove = decryptedAlert.attributes.scheduledTaskId;
    } catch (e) {
      // We'll skip invalidating the API key since we failed to load the decrypted saved object
      this.logger.error(
        `delete(): Failed to load API key to invalidate on alert ${id}: ${e.message}`
      );
      // Still attempt to load the scheduledTaskId using SOC
      const alert = await this.savedObjectsClient.get<RawAlert>('alert', id);
      taskIdToRemove = alert.attributes.scheduledTaskId;
    }

    const removeResult = await this.savedObjectsClient.delete('alert', id);

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
      alertSavedObject = await this.savedObjectsClient.get<RawAlert>('alert', id);
    }

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

    const updatedObject = await this.savedObjectsClient.update<RawAlert>(
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
      const alert = await this.savedObjectsClient.get<RawAlert>('alert', id);
      attributes = alert.attributes;
      version = alert.version;
    }

    const username = await this.getUserName();
    await this.savedObjectsClient.update(
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
      const alert = await this.savedObjectsClient.get<RawAlert>('alert', id);
      attributes = alert.attributes;
      version = alert.version;
    }

    if (attributes.enabled === false) {
      const username = await this.getUserName();
      await this.savedObjectsClient.update(
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
      await this.savedObjectsClient.update('alert', id, { scheduledTaskId: scheduledTask.id });
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
      const alert = await this.savedObjectsClient.get<RawAlert>('alert', id);
      attributes = alert.attributes;
      version = alert.version;
    }

    if (attributes.enabled === true) {
      await this.savedObjectsClient.update(
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
    await this.savedObjectsClient.update('alert', id, {
      muteAll: true,
      mutedInstanceIds: [],
      updatedBy: await this.getUserName(),
    });
  }

  public async unmuteAll({ id }: { id: string }) {
    await this.savedObjectsClient.update('alert', id, {
      muteAll: false,
      mutedInstanceIds: [],
      updatedBy: await this.getUserName(),
    });
  }

  public async muteInstance({ alertId, alertInstanceId }: MuteOptions) {
    const { attributes, version } = await this.savedObjectsClient.get<Alert>('alert', alertId);
    const mutedInstanceIds = attributes.mutedInstanceIds || [];
    if (!attributes.muteAll && !mutedInstanceIds.includes(alertInstanceId)) {
      mutedInstanceIds.push(alertInstanceId);
      await this.savedObjectsClient.update(
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
    const { attributes, version } = await this.savedObjectsClient.get<Alert>('alert', alertId);
    const mutedInstanceIds = attributes.mutedInstanceIds || [];
    if (!attributes.muteAll && mutedInstanceIds.includes(alertInstanceId)) {
      await this.savedObjectsClient.update(
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
    const availableAlertTypeActionGroups = new Set(map(alertTypeActionGroups, 'id'));
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
