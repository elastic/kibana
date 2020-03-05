/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Logger, KibanaRequest } from '../../../../../src/core/server';
import { validateParams, validateConfig, validateSecrets } from './validate_with_schema';
import {
  ActionTypeExecutorResult,
  ActionTypeRegistryContract,
  GetServicesFunction,
  RawAction,
} from '../types';
import { EncryptedSavedObjectsPluginStart } from '../../../encrypted_saved_objects/server';
import { SpacesServiceSetup } from '../../../spaces/server';
import { EVENT_LOG_ACTIONS } from '../plugin';
import { IEvent, IEventLogger } from '../../../event_log/server';

export interface ActionExecutorContext {
  logger: Logger;
  spaces?: SpacesServiceSetup;
  getServices: GetServicesFunction;
  encryptedSavedObjectsPlugin: EncryptedSavedObjectsPluginStart;
  actionTypeRegistry: ActionTypeRegistryContract;
  eventLogger: IEventLogger;
}

export interface ExecuteOptions {
  actionId: string;
  request: KibanaRequest;
  params: Record<string, any>;
}

export type ActionExecutorContract = PublicMethodsOf<ActionExecutor>;

export class ActionExecutor {
  private isInitialized = false;
  private actionExecutorContext?: ActionExecutorContext;
  private readonly isESOUsingEphemeralEncryptionKey: boolean;

  constructor({ isESOUsingEphemeralEncryptionKey }: { isESOUsingEphemeralEncryptionKey: boolean }) {
    this.isESOUsingEphemeralEncryptionKey = isESOUsingEphemeralEncryptionKey;
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
  }: ExecuteOptions): Promise<ActionTypeExecutorResult> {
    if (!this.isInitialized) {
      throw new Error('ActionExecutor not initialized');
    }

    if (this.isESOUsingEphemeralEncryptionKey === true) {
      throw new Error(
        `Unable to execute action due to the Encrypted Saved Objects plugin using an ephemeral encryption key. Please set xpack.encryptedSavedObjects.encryptionKey in kibana.yml`
      );
    }

    const {
      spaces,
      getServices,
      encryptedSavedObjectsPlugin,
      actionTypeRegistry,
      eventLogger,
    } = this.actionExecutorContext!;

    const services = getServices(request);
    const namespace = spaces && spaces.getSpaceId(request);

    // Ensure user can read the action before processing
    const {
      attributes: { actionTypeId, config, name },
    } = await services.savedObjectsClient.get<RawAction>('action', actionId);

    try {
      actionTypeRegistry.ensureActionTypeEnabled(actionTypeId);
    } catch (err) {
      return { status: 'error', actionId, message: err.message, retry: false };
    }

    // Only get encrypted attributes here, the remaining attributes can be fetched in
    // the savedObjectsClient call
    const {
      attributes: { secrets },
    } = await encryptedSavedObjectsPlugin.getDecryptedAsInternalUser<RawAction>(
      'action',
      actionId,
      {
        namespace: namespace === 'default' ? undefined : namespace,
      }
    );
    const actionType = actionTypeRegistry.get(actionTypeId);

    let validatedParams: Record<string, any>;
    let validatedConfig: Record<string, any>;
    let validatedSecrets: Record<string, any>;

    try {
      validatedParams = validateParams(actionType, params);
      validatedConfig = validateConfig(actionType, config);
      validatedSecrets = validateSecrets(actionType, secrets);
    } catch (err) {
      return { status: 'error', actionId, message: err.message, retry: false };
    }

    const actionLabel = `${actionTypeId}:${actionId}: ${name}`;
    const event: IEvent = {
      event: { action: EVENT_LOG_ACTIONS.execute },
      kibana: { namespace, saved_objects: [{ type: 'action', id: actionId }] },
    };

    eventLogger.startTiming(event);
    let rawResult: ActionTypeExecutorResult | null | undefined | void;
    try {
      rawResult = await actionType.executor({
        actionId,
        services,
        params: validatedParams,
        config: validatedConfig,
        secrets: validatedSecrets,
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

    if (result.status === 'ok') {
      event.message = `action executed: ${actionLabel}`;
    } else if (result.status === 'error') {
      event.message = `action execution failure: ${actionLabel}`;
      event.error = event.error || {};
      event.error.message = actionErrorToMessage(result);
    } else {
      event.message = `action execution returned unexpected result: ${actionLabel}`;
      event.error = event.error || {};
      event.error.message = 'action execution returned unexpected result';
    }

    eventLogger.logEvent(event);
    return result;
  }
}

function actionErrorToMessage(result: ActionTypeExecutorResult): string {
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
