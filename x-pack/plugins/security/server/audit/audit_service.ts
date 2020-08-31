/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Subscription } from 'rxjs';
import { Logger } from '../../../../../src/core/server';
import { SecurityLicense } from '../../common/licensing';
import { ConfigType } from '../config';

export interface AuditLogger {
  log: (eventType: string, message: string, data?: Record<string, any>) => void;
}

export interface AuditServiceSetup {
  getLogger: (id?: string) => AuditLogger;
}

interface AuditServiceSetupParams {
  license: SecurityLicense;
  config: ConfigType['audit'];
}

export class AuditService {
  private licenseFeaturesSubscription?: Subscription;
  private auditLoggingEnabled = false;

  constructor(private readonly logger: Logger) {}

  setup({ license, config }: AuditServiceSetupParams): AuditServiceSetup {
    if (config.enabled) {
      this.licenseFeaturesSubscription = license.features$.subscribe(({ allowAuditLogging }) => {
        this.auditLoggingEnabled = allowAuditLogging;
      });
    }

    return {
      getLogger: (id?: string): AuditLogger => {
        return {
          log: (eventType: string, message: string, data?: Record<string, any>) => {
            if (!this.auditLoggingEnabled) {
              return;
            }

            this.logger.info(message, {
              tags: id ? [id, eventType] : [eventType],
              eventType,
              ...data,
            });
          },
        };
      },
    };
  }

  stop() {
    if (this.licenseFeaturesSubscription) {
      this.licenseFeaturesSubscription.unsubscribe();
      this.licenseFeaturesSubscription = undefined;
    }
  }
}
