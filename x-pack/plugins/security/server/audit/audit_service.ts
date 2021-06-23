/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Subscription } from 'rxjs';
import { distinctUntilKeyChanged, map } from 'rxjs/operators';

import type {
  HttpServiceSetup,
  KibanaRequest,
  Logger,
  LoggerContextConfigInput,
  LoggingServiceSetup,
} from 'src/core/server';

import type { SpacesPluginSetup } from '../../../spaces/server';
import type { SecurityLicense, SecurityLicenseFeatures } from '../../common/licensing';
import type { ConfigType } from '../config';
import type { SecurityPluginSetup } from '../plugin';
import type { AuditEvent } from './audit_events';
import { httpRequestEvent } from './audit_events';

export const ECS_VERSION = '1.6.0';
export const RECORD_USAGE_INTERVAL = 60 * 60 * 1000; // 1 hour

/**
 * @deprecated
 */
export interface LegacyAuditLogger {
  log: (eventType: string, message: string, data?: Record<string, any>) => void;
}

export interface AuditLogger {
  log: (event: AuditEvent | undefined) => void;
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
  getSID(request: KibanaRequest): Promise<string | undefined>;
  getSpaceId(
    request: KibanaRequest
  ): ReturnType<SpacesPluginSetup['spacesService']['getSpaceId']> | undefined;
  recordAuditLoggingUsage(): void;
}

export class AuditService {
  /**
   * @deprecated
   */
  private licenseFeaturesSubscription?: Subscription;
  /**
   * @deprecated
   */
  private allowLegacyAuditLogging = false;
  private ecsLogger: Logger;
  private usageIntervalId?: NodeJS.Timeout;

  constructor(private readonly logger: Logger) {
    this.ecsLogger = logger.get('ecs');
  }

  setup({
    license,
    config,
    logging,
    http,
    getCurrentUser,
    getSID,
    getSpaceId,
    recordAuditLoggingUsage,
  }: AuditServiceSetupParams): AuditServiceSetup {
    if (config.enabled && !config.appender) {
      this.licenseFeaturesSubscription = license.features$.subscribe(
        ({ allowLegacyAuditLogging }) => {
          this.allowLegacyAuditLogging = allowLegacyAuditLogging;
        }
      );
    }

    // Configure logging during setup and when license changes
    logging.configure(
      license.features$.pipe(
        distinctUntilKeyChanged('allowAuditLogging'),
        createLoggingConfig(config)
      )
    );

    // Record feature usage at a regular interval if enabled and license allows
    if (config.enabled && config.appender) {
      license.features$.subscribe((features) => {
        clearInterval(this.usageIntervalId!);
        if (features.allowAuditLogging) {
          recordAuditLoggingUsage();
          this.usageIntervalId = setInterval(recordAuditLoggingUsage, RECORD_USAGE_INTERVAL);
          if (this.usageIntervalId.unref) {
            this.usageIntervalId.unref();
          }
        }
      });
    }

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
       *     outcome: 'unknown'
       *   },
       *   kibana: {
       *     saved_object: { type: 'dashboard', id: '123' }
       *   },
       * });
       * ```
       */
      const log: AuditLogger['log'] = async (event) => {
        if (!event) {
          return;
        }
        const spaceId = getSpaceId(request);
        const user = getCurrentUser(request);
        const sessionId = await getSID(request);
        const meta: AuditEvent = {
          ...event,
          user:
            (user && {
              name: user.username,
              roles: user.roles as string[],
            }) ||
            event.user,
          kibana: {
            space_id: spaceId,
            session_id: sessionId,
            ...event.kibana,
          },
          trace: { id: request.id },
        };
        if (filterEvent(meta, config.ignore_filters)) {
          const { message, ...eventMeta } = meta;
          this.ecsLogger.info(message, eventMeta);
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
          if (!this.allowLegacyAuditLogging) {
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
    clearInterval(this.usageIntervalId!);
  }
}

export const createLoggingConfig = (config: ConfigType['audit']) =>
  map<Pick<SecurityLicenseFeatures, 'allowAuditLogging'>, LoggerContextConfigInput>((features) => ({
    appenders: {
      auditTrailAppender: config.appender ?? {
        type: 'console',
        layout: {
          type: 'pattern',
          highlight: true,
        },
      },
    },
    loggers: [
      {
        name: 'audit.ecs',
        level: config.enabled && config.appender && features.allowAuditLogging ? 'info' : 'off',
        appenders: ['auditTrailAppender'],
      },
    ],
  }));

/**
 * Evaluates the list of provided ignore rules, and filters out events only
 * if *all* rules match the event.
 *
 * For event fields that can contain an array of multiple values, every value
 * must be matched by an ignore rule for the event to be excluded.
 */
export function filterEvent(
  event: AuditEvent,
  ignoreFilters: ConfigType['audit']['ignore_filters']
) {
  if (ignoreFilters) {
    return !ignoreFilters.some(
      (rule) =>
        (!rule.actions || rule.actions.includes(event.event?.action!)) &&
        (!rule.categories || event.event?.category?.every((c) => rule.categories?.includes(c))) &&
        (!rule.types || event.event?.type?.every((t) => rule.types?.includes(t))) &&
        (!rule.outcomes || rule.outcomes.includes(event.event?.outcome!)) &&
        (!rule.spaces || rule.spaces.includes(event.kibana?.space_id!))
    );
  }
  return true;
}
