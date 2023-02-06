/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PublicMethodsOf } from '@kbn/utility-types';
import { Logger, KibanaRequest } from '@kbn/core/server';
import { cloneDeep } from 'lodash';
import { withSpan } from '@kbn/apm-utils';
import { EncryptedSavedObjectsClient } from '@kbn/encrypted-saved-objects-plugin/server';
import { SpacesServiceStart } from '@kbn/spaces-plugin/server';
import { IEventLogger, SAVED_OBJECT_REL_PRIMARY } from '@kbn/event-log-plugin/server';
import {
  validateParams,
  validateConfig,
  validateSecrets,
  validateConnector,
} from './validate_with_schema';
import {
  ActionType,
  ActionTypeExecutorResult,
  ActionTypeExecutorRawResult,
  ActionTypeRegistryContract,
  GetServicesFunction,
  PreConfiguredAction,
  RawAction,
  ValidatorServices,
} from '../types';
import { EVENT_LOG_ACTIONS } from '../constants/event_log';
import { ActionsClient } from '../actions_client';
import { ActionExecutionSource } from './action_execution_source';
import { RelatedSavedObjects } from './related_saved_objects';
import { createActionEventLogRecordObject } from './create_action_event_log_record_object';
import { ActionExecutionError, ActionExecutionErrorReason } from './errors/action_execution_error';

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
  actionExecutionId: string;
  isEphemeral?: boolean;
  request: KibanaRequest;
  params: Record<string, unknown>;
  source?: ActionExecutionSource<Source>;
  taskInfo?: TaskInfo;
  executionId?: string;
  consumer?: string;
  relatedSavedObjects?: RelatedSavedObjects;
}

export type ActionExecutorContract = PublicMethodsOf<ActionExecutor>;

export class ActionExecutor {
  private isInitialized = false;
  private actionExecutorContext?: ActionExecutorContext;
  private readonly isESOCanEncrypt: boolean;

  private actionInfo: ActionInfo | undefined;

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
    executionId,
    consumer,
    relatedSavedObjects,
    actionExecutionId,
  }: ExecuteOptions): Promise<ActionTypeExecutorResult<unknown>> {
    if (!this.isInitialized) {
      throw new Error('ActionExecutor not initialized');
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

        const actionInfo = await getActionInfoInternal(
          getActionsClientWithRequest,
          request,
          this.isESOCanEncrypt,
          encryptedSavedObjectsClient,
          preconfiguredActions,
          actionId,
          namespace.namespace,
          source
        );

        const { actionTypeId, name, config, secrets } = actionInfo;
        const loggerId = actionTypeId.startsWith('.') ? actionTypeId.substring(1) : actionTypeId;
        let { logger } = this.actionExecutorContext!;
        logger = logger.get(loggerId);

        if (!this.actionInfo || this.actionInfo.actionId !== actionId) {
          this.actionInfo = actionInfo;
        }

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

        const actionLabel = `${actionTypeId}:${actionId}: ${name}`;
        logger.debug(`executing action ${actionLabel}`);

        const task = taskInfo
          ? {
              task: {
                scheduled: taskInfo.scheduled.toISOString(),
                scheduleDelay: Millis2Nanos * (Date.now() - taskInfo.scheduled.getTime()),
              },
            }
          : {};

        const event = createActionEventLogRecordObject({
          actionId,
          action: EVENT_LOG_ACTIONS.execute,
          consumer,
          ...namespace,
          ...task,
          executionId,
          spaceId,
          savedObjects: [
            {
              type: 'action',
              id: actionId,
              typeId: actionTypeId,
              relation: SAVED_OBJECT_REL_PRIMARY,
            },
          ],
          relatedSavedObjects,
          name,
          actionExecutionId,
          isPreconfigured: this.actionInfo.isPreconfigured,
        });

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

        let rawResult: ActionTypeExecutorRawResult<unknown>;
        try {
          const configurationUtilities = actionTypeRegistry.getUtils();
          const { validatedParams, validatedConfig, validatedSecrets } = validateAction(
            {
              actionId,
              actionType,
              params,
              config,
              secrets,
            },
            { configurationUtilities }
          );

          rawResult = await actionType.executor({
            actionId,
            services,
            params: validatedParams,
            config: validatedConfig,
            secrets: validatedSecrets,
            isEphemeral,
            taskInfo,
            configurationUtilities,
            logger,
          });
        } catch (err) {
          if (err.reason === ActionExecutionErrorReason.Validation) {
            rawResult = err.result;
          } else {
            rawResult = {
              actionId,
              status: 'error',
              message: 'an error occurred while running the action',
              serviceMessage: err.message,
              error: err,
              retry: true,
            };
          }
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
          if (result.error) {
            logger.error(result.error, {
              tags: [actionTypeId, actionId, 'action-run-failed'],
              error: { stack_trace: result.error.stack },
            });
          }
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
        const { error, ...resultWithoutError } = result;
        return resultWithoutError;
      }
    );
  }

  public async logCancellation<Source = unknown>({
    actionId,
    request,
    relatedSavedObjects,
    source,
    executionId,
    taskInfo,
    consumer,
    actionExecutionId,
  }: {
    actionId: string;
    actionExecutionId: string;
    request: KibanaRequest;
    taskInfo?: TaskInfo;
    executionId?: string;
    relatedSavedObjects: RelatedSavedObjects;
    source?: ActionExecutionSource<Source>;
    consumer?: string;
  }) {
    const {
      spaces,
      encryptedSavedObjectsClient,
      preconfiguredActions,
      eventLogger,
      getActionsClientWithRequest,
    } = this.actionExecutorContext!;

    const spaceId = spaces && spaces.getSpaceId(request);
    const namespace = spaceId && spaceId !== 'default' ? { namespace: spaceId } : {};
    if (!this.actionInfo || this.actionInfo.actionId !== actionId) {
      this.actionInfo = await getActionInfoInternal(
        getActionsClientWithRequest,
        request,
        this.isESOCanEncrypt,
        encryptedSavedObjectsClient,
        preconfiguredActions,
        actionId,
        namespace.namespace,
        source
      );
    }
    const task = taskInfo
      ? {
          task: {
            scheduled: taskInfo.scheduled.toISOString(),
            scheduleDelay: Millis2Nanos * (Date.now() - taskInfo.scheduled.getTime()),
          },
        }
      : {};
    // Write event log entry
    const event = createActionEventLogRecordObject({
      actionId,
      consumer,
      action: EVENT_LOG_ACTIONS.executeTimeout,
      message: `action: ${this.actionInfo.actionTypeId}:${actionId}: '${
        this.actionInfo.name ?? ''
      }' execution cancelled due to timeout - exceeded default timeout of "5m"`,
      ...namespace,
      ...task,
      executionId,
      spaceId,
      savedObjects: [
        {
          type: 'action',
          id: actionId,
          typeId: this.actionInfo.actionTypeId,
          relation: SAVED_OBJECT_REL_PRIMARY,
        },
      ],
      relatedSavedObjects,
      actionExecutionId,
      isPreconfigured: this.actionInfo.isPreconfigured,
    });

    eventLogger.logEvent(event);
  }
}

interface ActionInfo {
  actionTypeId: string;
  name: string;
  config: unknown;
  secrets: unknown;
  actionId: string;
  isPreconfigured?: boolean;
}

async function getActionInfoInternal<Source = unknown>(
  getActionsClientWithRequest: (
    request: KibanaRequest,
    authorizationContext?: ActionExecutionSource<unknown>
  ) => Promise<PublicMethodsOf<ActionsClient>>,
  request: KibanaRequest,
  isESOCanEncrypt: boolean,
  encryptedSavedObjectsClient: EncryptedSavedObjectsClient,
  preconfiguredActions: PreConfiguredAction[],
  actionId: string,
  namespace: string | undefined,
  source?: ActionExecutionSource<Source>
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
      actionId,
      isPreconfigured: true,
    };
  }

  if (!isESOCanEncrypt) {
    throw new Error(
      `Unable to execute action because the Encrypted Saved Objects plugin is missing encryption key. Please set xpack.encryptedSavedObjects.encryptionKey in the kibana.yml or use the bin/kibana-encryption-keys command.`
    );
  }

  const actionsClient = await getActionsClientWithRequest(request, source);

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
    actionId,
  };
}

function actionErrorToMessage(result: ActionTypeExecutorRawResult<unknown>): string {
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

interface ValidateActionOpts {
  actionId: string;
  actionType: ActionType;
  params: Record<string, unknown>;
  config: unknown;
  secrets: unknown;
}

function validateAction(
  { actionId, actionType, params, config, secrets }: ValidateActionOpts,
  validatorServices: ValidatorServices
) {
  let validatedParams: Record<string, unknown>;
  let validatedConfig: Record<string, unknown>;
  let validatedSecrets: Record<string, unknown>;

  try {
    validatedParams = validateParams(actionType, params, validatorServices);
    validatedConfig = validateConfig(actionType, config, validatorServices);
    validatedSecrets = validateSecrets(actionType, secrets, validatorServices);
    if (actionType.validate?.connector) {
      validateConnector(actionType, {
        config,
        secrets,
      });
    }

    return { validatedParams, validatedConfig, validatedSecrets };
  } catch (err) {
    throw new ActionExecutionError(err.message, ActionExecutionErrorReason.Validation, {
      actionId,
      status: 'error',
      message: err.message,
      retry: false,
    });
  }
}
