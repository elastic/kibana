/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginInitializerContext, CoreSetup, CoreStart, Plugin, Logger } from '@kbn/core/server';
import { registerSavedObjects } from './saved_objects';
import {
  AuditPluginSetup,
  AuditPluginSetupDeps,
  AuditPluginStart,
  AuditPluginStartDeps,
  AuditRequestHandlerContext,
} from './types';
import { AuditClientFactory } from './client';
import { AuditService } from './service';
import { AUDIT_SAVED_OBJECT_TYPE } from '../common';
import { defineRoutes } from './routes';

export class AuditPlugin
  implements Plugin<AuditPluginSetup, AuditPluginStart, AuditPluginSetupDeps, AuditPluginStartDeps>
{
  private readonly logger: Logger;
  private readonly auditClientFactory: AuditClientFactory;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
    this.auditClientFactory = new AuditClientFactory();
  }

  public setup(
    core: CoreSetup<AuditPluginStartDeps, AuditPluginSetupDeps>,
    plugins: AuditPluginSetupDeps
  ) {
    registerSavedObjects(core.savedObjects);

    core.http.registerRouteHandlerContext<AuditRequestHandlerContext, 'audit'>('audit', () => {
      return {
        getAuditClient: () => this.auditClientFactory.create(),
      };
    });

    defineRoutes(core.http.createRouter<AuditRequestHandlerContext>());

    this.logger.debug('audit: Setup');

    return {};
  }

  public start(core: CoreStart, plugins: AuditPluginStartDeps): AuditPluginStart {
    const auditRepository = core.savedObjects.createInternalRepository([AUDIT_SAVED_OBJECT_TYPE]);

    this.auditClientFactory.initialize({
      logger: this.logger,
      savedObjectsRepository: auditRepository,
    });

    this.logger.debug('audit: Started');

    return {
      createAuditService: (namespace: string) =>
        new AuditService({
          securityPluginStart: plugins.security,
          context: {
            client: this.auditClientFactory.create(),
            logger: this.logger,
          },
          namespace,
        }),
    };
  }

  public stop() {
    this.logger.debug('audit: Stop');
  }
}
