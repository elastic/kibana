/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PluginInitializerContext, Logger, CoreSetup } from 'src/core/server';
import { Subscription } from 'rxjs';
import { AuditLoggingPluginSetup } from './types';
import { LicensingPluginSetup } from '../../licensing/server';

interface PluginsSetup {
  licensing: LicensingPluginSetup;
}

export class AuditLoggingPlugin {
  private licensingSubscription?: Subscription;

  constructor(private readonly initializerContext: PluginInitializerContext) {}

  public setup(core: CoreSetup, plugins: PluginsSetup): AuditLoggingPluginSetup {
    let auditLoggingAllowed = false;
    let auditLoggingEnabled = false;
    this.licensingSubscription = plugins.licensing.license$.subscribe(license => {
      auditLoggingAllowed = license.hasAtLeast('standard');
    });

    return {
      __enableAuditLogging: () => {
        auditLoggingEnabled = true;
      },
      __disableAuditLogging: () => {
        auditLoggingEnabled = false;
      },
      createAuditLogger: (...contextParts: string[]) => {
        const baseLogger = this.initializerContext.logger.get('audit', ...contextParts);
        const loggers = new Map<string, Logger>();
        return {
          log: (eventType: string, message: string, data: Record<any, unknown> = {}) => {
            if (!auditLoggingAllowed || !auditLoggingEnabled) {
              return;
            }
            if (!loggers.has(eventType)) {
              loggers.set(eventType, baseLogger.get(eventType));
            }
            loggers.get(eventType)!.info(message, { ...data, eventType });
          },
        };
      },
    };
  }

  public start() {}

  public stop() {
    if (this.licensingSubscription) {
      this.licensingSubscription.unsubscribe();
      this.licensingSubscription = undefined;
    }
  }
}
