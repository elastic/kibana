/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PublicMethodsOf } from '@kbn/utility-types';
import { Logger, KibanaRequest } from 'src/core/server';
import { cloneDeep } from 'lodash';
import { withSpan } from '@kbn/apm-utils';
import {
  validateParams,
  validateConfig,
  validateSecrets,
  validateConnector,
} from './validate_with_schema';
import {
  ActionTypeExecutorResult,
  ActionTypeRegistryContract,
  GetServicesFunction,
  RawAction,
  PreConfiguredAction,
} from '../types';
import { EncryptedSavedObjectsClient } from '../../../encrypted_saved_objects/server';
import { SpacesServiceStart } from '../../../spaces/server';
import { EVENT_LOG_ACTIONS } from '../constants/event_log';
import { IEvent, IEventLogger, SAVED_OBJECT_REL_PRIMARY } from '../../../event_log/server';
import { ActionsClient } from '../actions_client';
import { ActionExecutionSource } from './action_execution_source';
import { RelatedSavedObjects } from './related_saved_objects';

// 1,000,000 nanoseconds in 1 millisecond
const Millis2Nanos = 1000 * 1000;

export interface ActionExecutorContext {
  logger: Logger;
  spaces?: SpacesServiceStart;
  getServices: GetServicesFunction;
  getActionsClientWithRequest: (
    request: KibanaRequest,
    authorizationContext?: ActionExecutionSource<unknown>
  ) => Promise<PublicMethodsOf<ActionsClient>>;
  encryptedSavedObjectsClient: EncryptedSavedObjectsClient;
  actionTypeRegistry: ActionTypeRegistryContract;
  eventLogger: IEventLogger;
  preconfiguredActions: PreConfiguredAction[];
}

export interface TaskInfo {
  scheduled: Date;
  attempts: number;
}

export interface ExecuteOptions<Source = unknown> {
  actionId: string;
  isEphemeral?: boolean;
  request: KibanaRequest;
  params: Record<string, unknown>;
  source?: ActionExecutionSource<Source>;
  taskInfo?: TaskInfo;
  relatedSavedObjects?: RelatedSavedObjects;
}

export type ActionExecutorContract = PublicMethodsOf<ActionExecutor>;

export class ActionExecutor {
  private isInitialized = false;
  private actionExecutorContext?: ActionExecutorContext;
  private readonly isESOCanEncrypt: boolean;

  constructor({ isESOCanEncrypt }: { isESOCanEncrypt: boolean }) {
    this.isESOCanEncrypt = isESOCanEncrypt;
  }

  public initialize(actionExecutorContext: ActionExecutorContext) {
    if (this.isInitialized) {
      throw new Error('ActionExecutor already initialized');
    }
    this.isInitialized = true;
    this.actionExecutorContext = actionExecutorContext;
  }

  public async execute({
    actionId,
    params,
    request,
    source,
    isEphemeral,
    taskInfo,
    relatedSavedObjects,
  }: ExecuteOptions): Promise<ActionTypeExecutorResult<unknown>> {
    if (!this.isInitialized) {
      throw new Error('ActionExecutor not initialized');
    }

    if (!this.isESOCanEncrypt) {
      throw new Error(
        `Unable to execute action because the Encrypted Saved Objects plugin is missing encryption key. Please set xpack.encryptedSavedObjects.encryptionKey in the kibana.yml or use the bin/kibana-encryption-keys command.`
      );
    }

    return withSpan(
      {
        name: `execute_action`,
        type: 'actions',
        labels: {
          actions_connector_id: actionId,
        },
      },
      async (span) => {
        const {
          logger,
          spaces,
          getServices,
          encryptedSavedObjectsClient,
          actionTypeRegistry,
          eventLogger,
          preconfiguredActions,
          getActionsClientWithRequest,
        } = this.actionExecutorContext!;

        const services = getServices(request);
        const spaceId = spaces && spaces.getSpaceId(request);
        const namespace = spaceId && spaceId !== 'default' ? { namespace: spaceId } : {};

        const { actionTypeId, name, config, secrets } = await getActionInfo(
          await getActionsClientWithRequest(request, source),
          encryptedSavedObjectsClient,
          preconfiguredActions,
          actionId,
          namespace.namespace
        );

        if (span) {
          span.name = `execute_action ${actionTypeId}`;
          span.addLabels({
            actions_connector_type_id: actionTypeId,
          });
        }

        if (!actionTypeRegistry.isActionExecutable(actionId, actionTypeId, { notifyUsage: true })) {
          actionTypeRegistry.ensureActionTypeEnabled(actionTypeId);
        }
        const actionType = actionTypeRegistry.get(actionTypeId);

        let validatedParams: Record<string, unknown>;
        let validatedConfig: Record<string, unknown>;
        let validatedSecrets: Record<string, unknown>;
        try {
          validatedParams = validateParams(actionType, params);
          validatedConfig = validateConfig(actionType, config);
          validatedSecrets = validateSecrets(actionType, secrets);
          if (actionType.validate?.connector) {
            validateConnector(actionType, {
              config,
              secrets,
            });
          }
        } catch (err) {
          span?.setOutcome('failure');
          return { status: 'error', actionId, message: err.message, retry: false };
        }

        const actionLabel = `${actionTypeId}:${actionId}: ${name}`;
        logger.debug(`executing action ${actionLabel}`);

        const task = taskInfo
          ? {
              task: {
                scheduled: taskInfo.scheduled.toISOString(),
                schedule_delay: Millis2Nanos * (Date.now() - taskInfo.scheduled.getTime()),
              },
            }
          : {};

        const event: IEvent = {
          event: { action: EVENT_LOG_ACTIONS.execute },
          kibana: {
            ...task,
            saved_objects: [
              {
                rel: SAVED_OBJECT_REL_PRIMARY,
                type: 'action',
                id: actionId,
                type_id: actionTypeId,
                ...namespace,
              },
            ],
          },
        };

        for (const relatedSavedObject of relatedSavedObjects || []) {
          event.kibana?.saved_objects?.push({
            rel: SAVED_OBJECT_REL_PRIMARY,
            type: relatedSavedObject.type,
            id: relatedSavedObject.id,
            type_id: relatedSavedObject.typeId,
            namespace: relatedSavedObject.namespace,
          });
        }

        eventLogger.startTiming(event);

        const startEvent = cloneDeep({
          ...event,
          event: {
            ...event.event,
            action: EVENT_LOG_ACTIONS.executeStart,
          },
          message: `action started: ${actionLabel}`,
        });
        eventLogger.logEvent(startEvent);

        let rawResult: ActionTypeExecutorResult<unknown>;
        try {
          rawResult = await actionType.executor({
            actionId,
            services,
            params: validatedParams,
            config: validatedConfig,
            secrets: validatedSecrets,
            isEphemeral,
            taskInfo,
          });
        } catch (err) {
          rawResult = {
            actionId,
            status: 'error',
            message: 'an error occurred while running the action executor',
            serviceMessage: err.message,
            retry: false,
          };
        }
        eventLogger.stopTiming(event);

        // allow null-ish return to indicate success
        const result = rawResult || {
          actionId,
          status: 'ok',
        };

        event.event = event.event || {};

        if (result.status === 'ok') {
          span?.setOutcome('success');
          event.event.outcome = 'success';
          event.message = `action executed: ${actionLabel}`;
        } else if (result.status === 'error') {
          span?.setOutcome('failure');
          event.event.outcome = 'failure';
          event.message = `action execution failure: ${actionLabel}`;
          event.error = event.error || {};
          event.error.message = actionErrorToMessage(result);
          logger.warn(`action execution failure: ${actionLabel}: ${event.error.message}`);
        } else {
          span?.setOutcome('failure');
          event.event.outcome = 'failure';
          event.message = `action execution returned unexpected result: ${actionLabel}: "${result.status}"`;
          event.error = event.error || {};
          event.error.message = 'action execution returned unexpected result';
          logger.warn(
            `action execution failure: ${actionLabel}: returned unexpected result "${result.status}"`
          );
        }

        eventLogger.logEvent(event);
        return result;
      }
    );
  }
}

function actionErrorToMessage(result: ActionTypeExecutorResult<unknown>): string {
  let message = result.message || 'unknown error running action';

  if (result.serviceMessage) {
    message = `${message}: ${result.serviceMessage}`;
  }

  if (result.retry instanceof Date) {
    message = `${message}; retry at ${result.retry.toISOString()}`;
  } else if (result.retry) {
    message = `${message}; retry: ${JSON.stringify(result.retry)}`;
  }

  return message;
}

interface ActionInfo {
  actionTypeId: string;
  name: string;
  config: unknown;
  secrets: unknown;
}

async function getActionInfo(
  actionsClient: PublicMethodsOf<ActionsClient>,
  encryptedSavedObjectsClient: EncryptedSavedObjectsClient,
  preconfiguredActions: PreConfiguredAction[],
  actionId: string,
  namespace: string | undefined
): Promise<ActionInfo> {
  // check to see if it's a pre-configured action first
  const pcAction = preconfiguredActions.find(
    (preconfiguredAction) => preconfiguredAction.id === actionId
  );
  if (pcAction) {
    return {
      actionTypeId: pcAction.actionTypeId,
      name: pcAction.name,
      config: pcAction.config,
      secrets: pcAction.secrets,
    };
  }

  // if not pre-configured action, should be a saved object
  // ensure user can read the action before processing
  const { actionTypeId, config, name } = await actionsClient.get({ id: actionId });

  const {
    attributes: { secrets },
  } = await encryptedSavedObjectsClient.getDecryptedAsInternalUser<RawAction>('action', actionId, {
    namespace: namespace === 'default' ? undefined : namespace,
  });

  return {
    actionTypeId,
    name,
    config,
    secrets,
  };
}
