/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  KibanaRequest,
  Logger,
  SavedObjectsServiceStart,
  PluginInitializerContext,
} from 'src/core/server';
import { PluginStartContract as ActionsPluginStartContract } from '../../actions/server';
import { AlertsClient } from './alerts_client';
import { AlertTypeRegistry, SpaceIdToNamespaceFunction } from './types';
import { SecurityPluginSetup, SecurityPluginStart } from '../../security/server';
import { EncryptedSavedObjectsClient } from '../../encrypted_saved_objects/server';
import { TaskManagerStartContract } from '../../task_manager/server';
import { IEventLogClientService } from '../../../plugins/event_log/server';
import { AlertingAuthorizationClientFactory } from './alerting_authorization_client_factory';
import { ALERTS_FEATURE_ID } from '../common';
export interface AlertsClientFactoryOpts {
  logger: Logger;
  taskManager: TaskManagerStartContract;
  alertTypeRegistry: AlertTypeRegistry;
  securityPluginSetup?: SecurityPluginSetup;
  securityPluginStart?: SecurityPluginStart;
  getSpaceId: (request: KibanaRequest) => string | undefined;
  spaceIdToNamespace: SpaceIdToNamespaceFunction;
  encryptedSavedObjectsClient: EncryptedSavedObjectsClient;
  actions: ActionsPluginStartContract;
  eventLog: IEventLogClientService;
  kibanaVersion: PluginInitializerContext['env']['packageInfo']['version'];
  authorization: AlertingAuthorizationClientFactory;
}

export class AlertsClientFactory {
  private isInitialized = false;
  private logger!: Logger;
  private taskManager!: TaskManagerStartContract;
  private alertTypeRegistry!: AlertTypeRegistry;
  private securityPluginSetup?: SecurityPluginSetup;
  private securityPluginStart?: SecurityPluginStart;
  private getSpaceId!: (request: KibanaRequest) => string | undefined;
  private spaceIdToNamespace!: SpaceIdToNamespaceFunction;
  private encryptedSavedObjectsClient!: EncryptedSavedObjectsClient;
  private actions!: ActionsPluginStartContract;
  private eventLog!: IEventLogClientService;
  private kibanaVersion!: PluginInitializerContext['env']['packageInfo']['version'];
  private authorization!: AlertingAuthorizationClientFactory;

  public initialize(options: AlertsClientFactoryOpts) {
    if (this.isInitialized) {
      throw new Error('AlertsClientFactory already initialized');
    }
    this.isInitialized = true;
    this.logger = options.logger;
    this.getSpaceId = options.getSpaceId;
    this.taskManager = options.taskManager;
    this.alertTypeRegistry = options.alertTypeRegistry;
    this.securityPluginSetup = options.securityPluginSetup;
    this.securityPluginStart = options.securityPluginStart;
    this.spaceIdToNamespace = options.spaceIdToNamespace;
    this.encryptedSavedObjectsClient = options.encryptedSavedObjectsClient;
    this.actions = options.actions;
    this.eventLog = options.eventLog;
    this.kibanaVersion = options.kibanaVersion;
    this.authorization = options.authorization;
  }

  public create(request: KibanaRequest, savedObjects: SavedObjectsServiceStart): AlertsClient {
    const { securityPluginSetup, securityPluginStart, actions, eventLog } = this;
    const spaceId = this.getSpaceId(request);

    if (!this.authorization) {
      throw new Error('AlertingAuthorizationClientFactory is not defined');
    }

    return new AlertsClient({
      spaceId,
      kibanaVersion: this.kibanaVersion,
      logger: this.logger,
      taskManager: this.taskManager,
      alertTypeRegistry: this.alertTypeRegistry,
      unsecuredSavedObjectsClient: savedObjects.getScopedClient(request, {
        excludedWrappers: ['security'],
        includedHiddenTypes: ['alert', 'api_key_pending_invalidation'],
      }),
      authorization: this.authorization.create(request, [ALERTS_FEATURE_ID]),
      actionsAuthorization: actions.getActionsAuthorizationWithRequest(request),
      namespace: this.spaceIdToNamespace(spaceId),
      encryptedSavedObjectsClient: this.encryptedSavedObjectsClient,
      auditLogger: securityPluginSetup?.audit.asScoped(request),
      async getUserName() {
        if (!securityPluginStart) {
          return null;
        }
        const user = await securityPluginStart.authc.getCurrentUser(request);
        return user ? user.username : null;
      },
      async createAPIKey(name: string) {
        if (!securityPluginStart) {
          return { apiKeysEnabled: false };
        }
        // Create an API key using the new grant API - in this case the Kibana system user is creating the
        // API key for the user, instead of having the user create it themselves, which requires api_key
        // privileges
        const createAPIKeyResult = await securityPluginStart.authc.apiKeys.grantAsInternalUser(
          request,
          { name, role_descriptors: {} }
        );
        if (!createAPIKeyResult) {
          return { apiKeysEnabled: false };
        }
        return {
          apiKeysEnabled: true,
          result: createAPIKeyResult,
        };
      },
      async getActionsClient() {
        return actions.getActionsClientWithRequest(request);
      },
      async getEventLogClient() {
        return eventLog.getClient(request);
      },
    });
  }
}
