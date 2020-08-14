/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import Boom from 'boom';
import {
  ILegacyScopedClusterClient,
  SavedObjectsClientContract,
  SavedObjectAttributes,
  SavedObject,
  KibanaRequest,
} from 'src/core/server';

import { i18n } from '@kbn/i18n';
import { ActionTypeRegistry } from './action_type_registry';
import { validateConfig, validateSecrets, ActionExecutorContract } from './lib';
import {
  ActionResult,
  FindActionResult,
  RawAction,
  PreConfiguredAction,
  ActionTypeExecutorResult,
} from './types';
import { PreconfiguredActionDisabledModificationError } from './lib/errors/preconfigured_action_disabled_modification';
import { ExecuteOptions } from './lib/action_executor';
import {
  ExecutionEnqueuer,
  ExecuteOptions as EnqueueExecutionOptions,
} from './create_execute_function';
import { ActionsAuthorization } from './authorization/actions_authorization';
import { ActionType } from '../common';

// We are assuming there won't be many actions. This is why we will load
// all the actions in advance and assume the total count to not go over 10000.
// We'll set this max setting assuming it's never reached.
export const MAX_ACTIONS_RETURNED = 10000;

interface ActionUpdate extends SavedObjectAttributes {
  name: string;
  config: SavedObjectAttributes;
  secrets: SavedObjectAttributes;
}

interface Action extends ActionUpdate {
  actionTypeId: string;
}

interface CreateOptions {
  action: Action;
}

interface ConstructorOptions {
  defaultKibanaIndex: string;
  scopedClusterClient: ILegacyScopedClusterClient;
  actionTypeRegistry: ActionTypeRegistry;
  unsecuredSavedObjectsClient: SavedObjectsClientContract;
  preconfiguredActions: PreConfiguredAction[];
  actionExecutor: ActionExecutorContract;
  executionEnqueuer: ExecutionEnqueuer;
  request: KibanaRequest;
  authorization: ActionsAuthorization;
}

interface UpdateOptions {
  id: string;
  action: ActionUpdate;
}

export class ActionsClient {
  private readonly defaultKibanaIndex: string;
  private readonly scopedClusterClient: ILegacyScopedClusterClient;
  private readonly unsecuredSavedObjectsClient: SavedObjectsClientContract;
  private readonly actionTypeRegistry: ActionTypeRegistry;
  private readonly preconfiguredActions: PreConfiguredAction[];
  private readonly actionExecutor: ActionExecutorContract;
  private readonly request: KibanaRequest;
  private readonly authorization: ActionsAuthorization;
  private readonly executionEnqueuer: ExecutionEnqueuer;

  constructor({
    actionTypeRegistry,
    defaultKibanaIndex,
    scopedClusterClient,
    unsecuredSavedObjectsClient,
    preconfiguredActions,
    actionExecutor,
    executionEnqueuer,
    request,
    authorization,
  }: ConstructorOptions) {
    this.actionTypeRegistry = actionTypeRegistry;
    this.unsecuredSavedObjectsClient = unsecuredSavedObjectsClient;
    this.scopedClusterClient = scopedClusterClient;
    this.defaultKibanaIndex = defaultKibanaIndex;
    this.preconfiguredActions = preconfiguredActions;
    this.actionExecutor = actionExecutor;
    this.executionEnqueuer = executionEnqueuer;
    this.request = request;
    this.authorization = authorization;
  }

  /**
   * Create an action
   */
  public async create({
    action: { actionTypeId, name, config, secrets },
  }: CreateOptions): Promise<ActionResult> {
    await this.authorization.ensureAuthorized('create', actionTypeId);

    const actionType = this.actionTypeRegistry.get(actionTypeId);
    const validatedActionTypeConfig = validateConfig(actionType, config);
    const validatedActionTypeSecrets = validateSecrets(actionType, secrets);

    this.actionTypeRegistry.ensureActionTypeEnabled(actionTypeId);

    const result = await this.unsecuredSavedObjectsClient.create('action', {
      actionTypeId,
      name,
      config: validatedActionTypeConfig as SavedObjectAttributes,
      secrets: validatedActionTypeSecrets as SavedObjectAttributes,
    });

    return {
      id: result.id,
      actionTypeId: result.attributes.actionTypeId,
      name: result.attributes.name,
      config: result.attributes.config,
      isPreconfigured: false,
    };
  }

  /**
   * Update action
   */
  public async update({ id, action }: UpdateOptions): Promise<ActionResult> {
    await this.authorization.ensureAuthorized('update');

    if (
      this.preconfiguredActions.find((preconfiguredAction) => preconfiguredAction.id === id) !==
      undefined
    ) {
      throw new PreconfiguredActionDisabledModificationError(
        i18n.translate('xpack.actions.serverSideErrors.predefinedActionUpdateDisabled', {
          defaultMessage: 'Preconfigured action {id} is not allowed to update.',
          values: {
            id,
          },
        }),
        'update'
      );
    }
    const existingObject = await this.unsecuredSavedObjectsClient.get<RawAction>('action', id);
    const { actionTypeId } = existingObject.attributes;
    const { name, config, secrets } = action;
    const actionType = this.actionTypeRegistry.get(actionTypeId);
    const validatedActionTypeConfig = validateConfig(actionType, config);
    const validatedActionTypeSecrets = validateSecrets(actionType, secrets);

    this.actionTypeRegistry.ensureActionTypeEnabled(actionTypeId);

    const result = await this.unsecuredSavedObjectsClient.update<RawAction>('action', id, {
      actionTypeId,
      name,
      config: validatedActionTypeConfig as SavedObjectAttributes,
      secrets: validatedActionTypeSecrets as SavedObjectAttributes,
    });

    return {
      id,
      actionTypeId: result.attributes.actionTypeId as string,
      name: result.attributes.name as string,
      config: result.attributes.config as Record<string, unknown>,
      isPreconfigured: false,
    };
  }

  /**
   * Get an action
   */
  public async get({ id }: { id: string }): Promise<ActionResult> {
    await this.authorization.ensureAuthorized('get');

    const preconfiguredActionsList = this.preconfiguredActions.find(
      (preconfiguredAction) => preconfiguredAction.id === id
    );
    if (preconfiguredActionsList !== undefined) {
      return {
        id,
        actionTypeId: preconfiguredActionsList.actionTypeId,
        name: preconfiguredActionsList.name,
        isPreconfigured: true,
      };
    }
    const result = await this.unsecuredSavedObjectsClient.get<RawAction>('action', id);

    return {
      id,
      actionTypeId: result.attributes.actionTypeId,
      name: result.attributes.name,
      config: result.attributes.config,
      isPreconfigured: false,
    };
  }

  /**
   * Get all actions with preconfigured list
   */
  public async getAll(): Promise<FindActionResult[]> {
    await this.authorization.ensureAuthorized('get');

    const savedObjectsActions = (
      await this.unsecuredSavedObjectsClient.find<RawAction>({
        perPage: MAX_ACTIONS_RETURNED,
        type: 'action',
      })
    ).saved_objects.map(actionFromSavedObject);

    const mergedResult = [
      ...savedObjectsActions,
      ...this.preconfiguredActions.map((preconfiguredAction) => ({
        id: preconfiguredAction.id,
        actionTypeId: preconfiguredAction.actionTypeId,
        name: preconfiguredAction.name,
        isPreconfigured: true,
      })),
    ].sort((a, b) => a.name.localeCompare(b.name));
    return await injectExtraFindData(
      this.defaultKibanaIndex,
      this.scopedClusterClient,
      mergedResult
    );
  }

  /**
   * Get bulk actions with preconfigured list
   */
  public async getBulk(ids: string[]): Promise<ActionResult[]> {
    await this.authorization.ensureAuthorized('get');

    const actionResults = new Array<ActionResult>();
    for (const actionId of ids) {
      const action = this.preconfiguredActions.find(
        (preconfiguredAction) => preconfiguredAction.id === actionId
      );
      if (action !== undefined) {
        actionResults.push(action);
      }
    }

    // Fetch action objects in bulk
    // Excluding preconfigured actions to avoid an not found error, which is already added
    const actionSavedObjectsIds = [
      ...new Set(
        ids.filter(
          (actionId) => !actionResults.find((actionResult) => actionResult.id === actionId)
        )
      ),
    ];

    const bulkGetOpts = actionSavedObjectsIds.map((id) => ({ id, type: 'action' }));
    const bulkGetResult = await this.unsecuredSavedObjectsClient.bulkGet<RawAction>(bulkGetOpts);

    for (const action of bulkGetResult.saved_objects) {
      if (action.error) {
        throw Boom.badRequest(
          `Failed to load action ${action.id} (${action.error.statusCode}): ${action.error.message}`
        );
      }
      actionResults.push(actionFromSavedObject(action));
    }
    return actionResults;
  }

  /**
   * Delete action
   */
  public async delete({ id }: { id: string }) {
    await this.authorization.ensureAuthorized('delete');

    if (
      this.preconfiguredActions.find((preconfiguredAction) => preconfiguredAction.id === id) !==
      undefined
    ) {
      throw new PreconfiguredActionDisabledModificationError(
        i18n.translate('xpack.actions.serverSideErrors.predefinedActionDeleteDisabled', {
          defaultMessage: 'Preconfigured action {id} is not allowed to delete.',
          values: {
            id,
          },
        }),
        'delete'
      );
    }
    return await this.unsecuredSavedObjectsClient.delete('action', id);
  }

  public async execute({
    actionId,
    params,
  }: Omit<ExecuteOptions, 'request'>): Promise<ActionTypeExecutorResult<unknown>> {
    await this.authorization.ensureAuthorized('execute');
    return this.actionExecutor.execute({ actionId, params, request: this.request });
  }

  public async enqueueExecution(options: EnqueueExecutionOptions): Promise<void> {
    await this.authorization.ensureAuthorized('execute');
    return this.executionEnqueuer(this.unsecuredSavedObjectsClient, options);
  }

  public async listTypes(): Promise<ActionType[]> {
    return this.actionTypeRegistry.list();
  }
}

function actionFromSavedObject(savedObject: SavedObject<RawAction>): ActionResult {
  return {
    id: savedObject.id,
    ...savedObject.attributes,
    isPreconfigured: false,
  };
}

async function injectExtraFindData(
  defaultKibanaIndex: string,
  scopedClusterClient: ILegacyScopedClusterClient,
  actionResults: ActionResult[]
): Promise<FindActionResult[]> {
  const aggs: Record<string, unknown> = {};
  for (const actionResult of actionResults) {
    aggs[actionResult.id] = {
      filter: {
        bool: {
          must: {
            nested: {
              path: 'references',
              query: {
                bool: {
                  filter: {
                    bool: {
                      must: [
                        {
                          term: {
                            'references.id': actionResult.id,
                          },
                        },
                        {
                          term: {
                            'references.type': 'action',
                          },
                        },
                      ],
                    },
                  },
                },
              },
            },
          },
        },
      },
    };
  }
  const aggregationResult = await scopedClusterClient.callAsInternalUser('search', {
    index: defaultKibanaIndex,
    body: {
      aggs,
      size: 0,
      query: {
        match_all: {},
      },
    },
  });
  return actionResults.map((actionResult) => ({
    ...actionResult,
    referencedByCount: aggregationResult.aggregations[actionResult.id].doc_count,
  }));
}
