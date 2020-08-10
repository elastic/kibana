/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Subject, combineLatest, of } from 'rxjs';
import { filter } from 'rxjs/operators';
import { KibanaRequest, Logger } from 'src/core/server';

import {
  AuditEvent,
  AuditorFactory,
  LoggingServiceSetup,
  AuditTrailSetup,
  HttpServiceSetup,
} from 'src/core/server';
import { AuditTrailClient } from './audit_trail_client';

import { SecurityPluginSetup } from '../';
import { SpacesPluginSetup } from '../../../spaces/server';
import { SecurityLicense } from '../../common/licensing';
import { ConfigType } from '../config';
import { httpRequestEvent } from './audit_events';

export interface SetupParams {
  license: Pick<SecurityLicense, 'features$'>;
  config: ConfigType['audit'];
  getCurrentUser: SecurityPluginSetup['authc']['getCurrentUser'];
  getSpacesService(): Pick<SpacesPluginSetup['spacesService'], 'getSpaceId'> | undefined;
  logging: Pick<LoggingServiceSetup, 'configure'>;
  auditTrail: Pick<AuditTrailSetup, 'register'>;
  http: Pick<HttpServiceSetup, 'registerOnPostAuth'>;
}

export class AuditTrailService {
  private readonly event$ = new Subject<AuditEvent>();

  constructor(private readonly logger: Logger) {}

  public setup({
    license,
    config,
    logging,
    http,
    auditTrail,
    getCurrentUser,
    getSpacesService,
  }: SetupParams) {
    combineLatest([this.event$.asObservable(), license.features$])
      .pipe(
        filter(
          ([event, licenseFeatures]) =>
            licenseFeatures.allowAuditLogging && filterEvent(event, config.ignore_filters)
        )
      )
      .subscribe(([{ message, ...other }]) => this.logger.info(message, other));

    const depsApi = {
      getCurrentUser,
      getSpaceId: (request: KibanaRequest) => getSpacesService?.()?.getSpaceId(request)!,
    };
    const auditorFactory: AuditorFactory = {
      asScoped: (request) => {
        return new AuditTrailClient(request, this.event$, depsApi);
      },
    };
    auditTrail.register(auditorFactory);

    http.registerOnPostAuth((request, response, t) => {
      if (request.auth.isAuthenticated) {
        auditorFactory.asScoped(request).add(httpRequestEvent, { request });
      }
      return t.next();
    });

    logging.configure(
      of({
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
            context: 'audit_trail',
            level: config.enabled && config.appender ? 'info' : 'off',
            appenders: ['auditTrailAppender'],
          },
        ],
      })
    );
  }

  public stop() {
    this.event$.complete();
  }
}

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
        (!rule.spaces || rule.spaces.includes(event.kibana.space_id!))
    );
  }
  return true;
}
