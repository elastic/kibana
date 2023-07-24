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
import { SecurityPluginStart } from '@kbn/security-plugin/server';
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
  InMemoryConnector,
  RawAction,
  ValidatorServices,
  ActionTypeSecrets,
  ActionTypeConfig,
} from '../types';
import { EVENT_LOG_ACTIONS } from '../constants/event_log';
import { ActionExecutionSource } from './action_execution_source';
import { RelatedSavedObjects } from './related_saved_objects';
import { createActionEventLogRecordObject } from './create_action_event_log_record_object';
import { ActionExecutionError, ActionExecutionErrorReason } from './errors/action_execution_error';
import type { ActionsAuthorization } from '../authorization/actions_authorization';

// 1,000,000 nanoseconds in 1 millisecond
const Millis2Nanos = 1000 * 1000;

export interface ActionExecutorContext {
  logger: Logger;
  spaces?: SpacesServiceStart;
  security?: SecurityPluginStart;
  getServices: GetServicesFunction;
  encryptedSavedObjectsClient: EncryptedSavedObjectsClient;
  actionTypeRegistry: ActionTypeRegistryContract;
  eventLogger: IEventLogger;
  inMemoryConnectors: InMemoryConnector[];
  getActionsAuthorizationWithRequest: (request: KibanaRequest) => ActionsAuthorization;
}

export interface TaskInfo {
  scheduled: Date;
  attempts: number;
  numSkippedRuns?: number;
}

export interface ExecuteOptions<Source = unknown> {
  actionId: string;
  actionExecutionId: string;
  isEphemeral?: boolean;
  request: KibanaRequest;
  params: Record<string, unknown>;
  source?: ActionExecutionSource<Source>;
  taskInfo?: TaskInfo;
  actionInfo?: ActionInfo;
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
    actionInfo: actionInfoFromTaskRunner,
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
          actionTypeRegistry,
          eventLogger,
          security,
          getActionsAuthorizationWithRequest,
        } = this.actionExecutorContext!;

        const services = getServices(request);
        const spaceId = spaces && spaces.getSpaceId(request);
        const namespace = spaceId && spaceId !== 'default' ? { namespace: spaceId } : {};
        const authorization = getActionsAuthorizationWithRequest(request);

        const actionInfo =
          actionInfoFromTaskRunner ||
          (await this.getActionInfoInternal(actionId, request, namespace.namespace));

        const { actionTypeId, name, config, secrets } = actionInfo;

        if (!this.actionInfo || this.actionInfo.actionId !== actionId) {
          this.actionInfo = actionInfo;
        }

        if (!actionTypeRegistry.isActionExecutable(actionId, actionTypeId, { notifyUsage: true })) {
          actionTypeRegistry.ensureActionTypeEnabled(actionTypeId);
        }
        const actionType = actionTypeRegistry.get(actionTypeId);
        const configurationUtilities = actionTypeRegistry.getUtils();

        let validatedParams;
        let validatedConfig;
        let validatedSecrets;
        try {
          const validationResult = validateAction(
            {
              actionId,
              actionType,
              params,
              config,
              secrets,
              taskInfo,
            },
            { configurationUtilities }
          );
          validatedParams = validationResult.validatedParams;
          validatedConfig = validationResult.validatedConfig;
          validatedSecrets = validationResult.validatedSecrets;
        } catch (err) {
          return err.result;
        }

        const loggerId = actionTypeId.startsWith('.') ? actionTypeId.substring(1) : actionTypeId;
        let { logger } = this.actionExecutorContext!;
        logger = logger.get(loggerId);

        if (span) {
          span.name = `execute_action ${actionTypeId}`;
          span.addLabels({
            actions_connector_type_id: actionTypeId,
          });
        }

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
          isInMemory: this.actionInfo.isInMemory,
          ...(source ? { source } : {}),
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
          /**
           * Ensures correct permissions for execution and
           * performs authorization checks for system actions.
           * It will thrown an error in case of failure.
           */
          await ensureAuthorizedToExecute({
            params,
            actionId,
            actionTypeId,
            actionTypeRegistry,
            authorization,
          });

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
            source,
          });
        } catch (err) {
          if (
            err.reason === ActionExecutionErrorReason.Validation ||
            err.reason === ActionExecutionErrorReason.Authorization
          ) {
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

        // start gen_ai extension
        // add event.kibana.action.execution.gen_ai to event log when GenerativeAi Connector is executed
        if (result.status === 'ok' && actionTypeId === '.gen-ai') {
          const data = result.data as unknown as {
            usage: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
          };
          event.kibana = event.kibana || {};
          event.kibana.action = event.kibana.action || {};
          event.kibana = {
            ...event.kibana,
            action: {
              ...event.kibana.action,
              execution: {
                ...event.kibana.action.execution,
                gen_ai: {
                  usage: {
                    total_tokens: data.usage?.total_tokens,
                    prompt_tokens: data.usage?.prompt_tokens,
                    completion_tokens: data.usage?.completion_tokens,
                  },
                },
              },
            },
          };
        }
        // end gen_ai extension

        const currentUser = security?.authc.getCurrentUser(request);

        event.user = event.user || {};
        event.user.name = currentUser?.username;
        event.user.id = currentUser?.profile_uid;

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
    const { spaces, eventLogger } = this.actionExecutorContext!;

    const spaceId = spaces && spaces.getSpaceId(request);
    const namespace = spaceId && spaceId !== 'default' ? { namespace: spaceId } : {};
    if (!this.actionInfo || this.actionInfo.actionId !== actionId) {
      this.actionInfo = await this.getActionInfoInternal(actionId, request, namespace.namespace);
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
      isInMemory: this.actionInfo.isInMemory,
      ...(source ? { source } : {}),
    });

    eventLogger.logEvent(event);
  }

  public async getActionInfoInternal(
    actionId: string,
    request: KibanaRequest,
    namespace: string | undefined
  ): Promise<ActionInfo> {
    const { encryptedSavedObjectsClient, inMemoryConnectors } = this.actionExecutorContext!;

    // check to see if it's in memory action first
    const inMemoryAction = inMemoryConnectors.find(
      (inMemoryConnector) => inMemoryConnector.id === actionId
    );
    if (inMemoryAction) {
      return {
        actionTypeId: inMemoryAction.actionTypeId,
        name: inMemoryAction.name,
        config: inMemoryAction.config,
        secrets: inMemoryAction.secrets,
        actionId,
        isInMemory: true,
        rawAction: { ...inMemoryAction, isMissingSecrets: false },
      };
    }

    if (!this.isESOCanEncrypt) {
      throw new Error(
        `Unable to execute action because the Encrypted Saved Objects plugin is missing encryption key. Please set xpack.encryptedSavedObjects.encryptionKey in the kibana.yml or use the bin/kibana-encryption-keys command.`
      );
    }

    const rawAction = await encryptedSavedObjectsClient.getDecryptedAsInternalUser<RawAction>(
      'action',
      actionId,
      {
        namespace: namespace === 'default' ? undefined : namespace,
      }
    );

    const {
      attributes: { secrets, actionTypeId, config, name },
    } = rawAction;

    return {
      actionTypeId,
      name,
      config,
      secrets,
      actionId,
      rawAction: rawAction.attributes,
    };
  }
}

export interface ActionInfo {
  actionTypeId: string;
  name: string;
  config: ActionTypeConfig;
  secrets: ActionTypeSecrets;
  actionId: string;
  isInMemory?: boolean;
  rawAction: RawAction;
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
  config: Record<string, unknown>;
  secrets: Record<string, unknown>;
  taskInfo?: TaskInfo;
}

function validateAction(
  { actionId, actionType, params, config, secrets, taskInfo }: ValidateActionOpts,
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
      retry: !!taskInfo,
    });
  }
}

interface EnsureAuthorizedToExecuteOpts {
  actionId: string;
  actionTypeId: string;
  params: Record<string, unknown>;
  actionTypeRegistry: ActionTypeRegistryContract;
  authorization: ActionsAuthorization;
}

const ensureAuthorizedToExecute = async ({
  actionId,
  actionTypeId,
  params,
  actionTypeRegistry,
  authorization,
}: EnsureAuthorizedToExecuteOpts) => {
  try {
    if (actionTypeRegistry.isSystemActionType(actionTypeId)) {
      const additionalPrivileges = actionTypeRegistry.getSystemActionKibanaPrivileges(
        actionTypeId,
        params
      );

      await authorization.ensureAuthorized({ operation: 'execute', additionalPrivileges });
    }
  } catch (error) {
    throw new ActionExecutionError(error.message, ActionExecutionErrorReason.Authorization, {
      actionId,
      status: 'error',
      message: error.message,
      retry: false,
    });
  }
};
