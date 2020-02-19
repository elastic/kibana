/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import uuid from 'uuid';
import { AlertsClient } from './alerts_client';
import { AlertTypeRegistry, SpaceIdToNamespaceFunction } from './types';
import { KibanaRequest, Logger, SavedObjectsClientContract } from '../../../../src/core/server';
import { InvalidateAPIKeyParams, SecurityPluginSetup } from '../../../plugins/security/server';
import { EncryptedSavedObjectsPluginStart } from '../../../plugins/encrypted_saved_objects/server';
import { TaskManagerStartContract } from '../../../plugins/task_manager/server';

export interface AlertsClientFactoryOpts {
  logger: Logger;
  taskManager: TaskManagerStartContract;
  alertTypeRegistry: AlertTypeRegistry;
  securityPluginSetup?: SecurityPluginSetup;
  getSpaceId: (request: KibanaRequest) => string | undefined;
  spaceIdToNamespace: SpaceIdToNamespaceFunction;
  encryptedSavedObjectsPlugin: EncryptedSavedObjectsPluginStart;
}

export class AlertsClientFactory {
  private isInitialized = false;
  private logger!: Logger;
  private taskManager!: TaskManagerStartContract;
  private alertTypeRegistry!: AlertTypeRegistry;
  private securityPluginSetup?: SecurityPluginSetup;
  private getSpaceId!: (request: KibanaRequest) => string | undefined;
  private spaceIdToNamespace!: SpaceIdToNamespaceFunction;
  private encryptedSavedObjectsPlugin!: EncryptedSavedObjectsPluginStart;

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
    this.spaceIdToNamespace = options.spaceIdToNamespace;
    this.encryptedSavedObjectsPlugin = options.encryptedSavedObjectsPlugin;
  }

  public create(
    request: KibanaRequest,
    savedObjectsClient: SavedObjectsClientContract
  ): AlertsClient {
    const { securityPluginSetup } = this;
    const spaceId = this.getSpaceId(request);
    return new AlertsClient({
      spaceId,
      logger: this.logger,
      taskManager: this.taskManager,
      alertTypeRegistry: this.alertTypeRegistry,
      savedObjectsClient,
      namespace: this.spaceIdToNamespace(spaceId),
      encryptedSavedObjectsPlugin: this.encryptedSavedObjectsPlugin,
      async getUserName() {
        if (!securityPluginSetup) {
          return null;
        }
        const user = await securityPluginSetup.authc.getCurrentUser(request);
        return user ? user.username : null;
      },
      async createAPIKey() {
        if (!securityPluginSetup) {
          return { apiKeysEnabled: false };
        }
        const createAPIKeyResult = await securityPluginSetup.authc.createAPIKey(request, {
          name: `source: alerting, generated uuid: "${uuid.v4()}"`,
          role_descriptors: {},
        });
        if (!createAPIKeyResult) {
          return { apiKeysEnabled: false };
        }
        return {
          apiKeysEnabled: true,
          result: createAPIKeyResult,
        };
      },
      async invalidateAPIKey(params: InvalidateAPIKeyParams) {
        if (!securityPluginSetup) {
          return { apiKeysEnabled: false };
        }
        const invalidateAPIKeyResult = await securityPluginSetup.authc.invalidateAPIKey(
          request,
          params
        );
        // Null when Elasticsearch security is disabled
        if (!invalidateAPIKeyResult) {
          return { apiKeysEnabled: false };
        }
        return {
          apiKeysEnabled: true,
          result: invalidateAPIKeyResult,
        };
      },
    });
  }
}
