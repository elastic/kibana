/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Subscription } from 'rxjs';
import { map, distinctUntilKeyChanged } from 'rxjs/operators';
import {
  Logger,
  LoggingServiceSetup,
  KibanaRequest,
  HttpServiceSetup,
  LoggerContextConfigInput,
} from '../../../../../src/core/server';
import { SecurityLicense, SecurityLicenseFeatures } from '../../common/licensing';
import { ConfigType } from '../config';
import { SpacesPluginSetup } from '../../../spaces/server';
import { AuditEvent, httpRequestEvent } from './audit_events';
import { SecurityPluginSetup } from '..';

export const ECS_VERSION = '1.6.0';

/**
 * @deprecated
 */
export interface LegacyAuditLogger {
  log: (eventType: string, message: string, data?: Record<string, any>) => void;
}

export interface AuditLogger {
  log: (event: AuditEvent | undefined) => void;
}

interface AuditLogMeta extends AuditEvent {
  ecs: {
    version: string;
  };
  session?: {
    id: string;
  };
  trace: {
    id: string;
  };
}

export interface AuditServiceSetup {
  asScoped: (request: KibanaRequest) => AuditLogger;
  getLogger: (id?: string) => LegacyAuditLogger;
}

interface AuditServiceSetupParams {
  license: SecurityLicense;
  config: ConfigType['audit'];
  logging: Pick<LoggingServiceSetup, 'configure'>;
  http: Pick<HttpServiceSetup, 'registerOnPostAuth'>;
  getCurrentUser(
    request: KibanaRequest
  ): ReturnType<SecurityPluginSetup['authc']['getCurrentUser']> | undefined;
  getSpaceId(
    request: KibanaRequest
  ): ReturnType<SpacesPluginSetup['spacesService']['getSpaceId']> | undefined;
}

export class AuditService {
  /**
   * @deprecated
   */
  private licenseFeaturesSubscription?: Subscription;
  /**
   * @deprecated
   */
  private allowAuditLogging = false;

  private ecsLogger: Logger;

  constructor(private readonly logger: Logger) {
    this.ecsLogger = logger.get('ecs');
  }

  setup({
    license,
    config,
    logging,
    http,
    getCurrentUser,
    getSpaceId,
  }: AuditServiceSetupParams): AuditServiceSetup {
    if (config.enabled && !config.appender) {
      this.licenseFeaturesSubscription = license.features$.subscribe(({ allowAuditLogging }) => {
        this.allowAuditLogging = allowAuditLogging;
      });
    }

    // Configure logging during setup and when license changes
    logging.configure(
      license.features$.pipe(
        distinctUntilKeyChanged('allowAuditLogging'),
        createLoggingConfig(config)
      )
    );

    /**
     * Creates an {@link AuditLogger} scoped to the current request.
     *
     * @example
     * ```typescript
     * const auditLogger = securitySetup.audit.asScoped(request);
     * auditLogger.log(event);
     * ```
     */
    const asScoped = (request: KibanaRequest): AuditLogger => {
      /**
       * Logs an {@link AuditEvent} and automatically adds meta data about the
       * current user, space and correlation id.
       *
       * Guidelines around what events should be logged and how they should be
       * structured can be found in: `/x-pack/plugins/security/README.md`
       *
       * @example
       * ```typescript
       * const auditLogger = securitySetup.audit.asScoped(request);
       * auditLogger.log({
       *   message: 'User is updating dashboard [id=123]',
       *   event: {
       *     action: 'saved_object_update',
       *     outcome: EventOutcome.UNKNOWN
       *   },
       *   kibana: {
       *     saved_object: { type: 'dashboard', id: '123' }
       *   },
       * });
       * ```
       */
      const log: AuditLogger['log'] = (event) => {
        if (!event) {
          return;
        }
        const user = getCurrentUser(request);
        const spaceId = getSpaceId(request);
        const meta: AuditLogMeta = {
          ecs: { version: ECS_VERSION },
          ...event,
          user:
            (user && {
              name: user.username,
              roles: user.roles,
            }) ||
            event.user,
          kibana: {
            space_id: spaceId,
            ...event.kibana,
          },
          trace: {
            id: request.id,
          },
        };
        if (filterEvent(meta, config.ignore_filters)) {
          this.ecsLogger.info(event.message!, meta);
        }
      };
      return { log };
    };

    /**
     * @deprecated
     * Use `audit.asScoped(request)` method instead to create an audit logger
     */
    const getLogger = (id?: string): LegacyAuditLogger => {
      return {
        log: (eventType: string, message: string, data?: Record<string, any>) => {
          if (!this.allowAuditLogging) {
            return;
          }

          this.logger.info(message, {
            tags: id ? [id, eventType] : [eventType],
            eventType,
            ...data,
          });
        },
      };
    };

    http.registerOnPostAuth((request, response, t) => {
      if (request.auth.isAuthenticated) {
        asScoped(request).log(httpRequestEvent({ request }));
      }
      return t.next();
    });

    return { asScoped, getLogger };
  }

  stop() {
    if (this.licenseFeaturesSubscription) {
      this.licenseFeaturesSubscription.unsubscribe();
      this.licenseFeaturesSubscription = undefined;
    }
  }
}

export const createLoggingConfig = (config: ConfigType['audit']) =>
  map<Pick<SecurityLicenseFeatures, 'allowAuditLogging'>, LoggerContextConfigInput>((features) => ({
    appenders: {
      auditTrailAppender: config.appender ?? {
        kind: 'console',
        layout: {
          kind: 'pattern',
          highlight: true,
        },
      },
    },
    loggers: [
      {
        context: 'audit.ecs',
        level: config.enabled && config.appender && features.allowAuditLogging ? 'info' : 'off',
        appenders: ['auditTrailAppender'],
      },
    ],
  }));

export function filterEvent(
  event: AuditEvent,
  ignoreFilters: ConfigType['audit']['ignore_filters']
) {
  if (ignoreFilters) {
    return !ignoreFilters.some(
      (rule) =>
        (!rule.actions || rule.actions.includes(event.event.action)) &&
        (!rule.categories || rule.categories.includes(event.event.category!)) &&
        (!rule.types || rule.types.includes(event.event.type!)) &&
        (!rule.outcomes || rule.outcomes.includes(event.event.outcome!)) &&
        (!rule.spaces || rule.spaces.includes(event.kibana?.space_id!))
    );
  }
  return true;
}
