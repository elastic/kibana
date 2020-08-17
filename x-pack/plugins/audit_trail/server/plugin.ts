/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Observable, Subject } from 'rxjs';
import { map } from 'rxjs/operators';
import {
  AppenderConfigType,
  CoreSetup,
  CoreStart,
  KibanaRequest,
  Logger,
  LoggerContextConfigInput,
  Plugin,
  PluginInitializerContext,
} from 'src/core/server';

import { AuditEvent } from './types';
import { AuditTrailClient } from './client/audit_trail_client';
import { AuditTrailConfigType } from './config';

import { SecurityPluginSetup } from '../../security/server';
import { SpacesPluginSetup } from '../../spaces/server';
import { LicensingPluginStart } from '../../licensing/server';

interface DepsSetup {
  security: SecurityPluginSetup;
  spaces?: SpacesPluginSetup;
}

interface DepStart {
  licensing: LicensingPluginStart;
}

export class AuditTrailPlugin implements Plugin {
  private readonly logger: Logger;
  private readonly config$: Observable<AuditTrailConfigType>;
  private readonly event$ = new Subject<AuditEvent>();

  constructor(private readonly context: PluginInitializerContext) {
    this.logger = this.context.logger.get();
    this.config$ = this.context.config.create();
  }

  public setup(core: CoreSetup, deps: DepsSetup) {
    const depsApi = {
      getCurrentUser: deps.security.authc.getCurrentUser,
      getSpaceId: deps.spaces?.spacesService.getSpaceId,
    };

    this.event$.subscribe(({ message, ...other }) => this.logger.debug(message, other));

    core.auditTrail.register({
      asScoped: (request: KibanaRequest) => {
        return new AuditTrailClient(request, this.event$, depsApi);
      },
    });

    core.logging.configure(
      this.config$.pipe<LoggerContextConfigInput>(
        map((config) => ({
          appenders: {
            auditTrailAppender: this.getAppender(config),
          },
          loggers: [
            {
              // plugins.auditTrail prepended automatically
              context: '',
              // do not pipe in root log if disabled
              level: config.logger.enabled ? 'debug' : 'off',
              appenders: ['auditTrailAppender'],
            },
          ],
        }))
      )
    );
  }

  private getAppender(config: AuditTrailConfigType): AppenderConfigType {
    return (
      config.appender ?? {
        kind: 'console',
        layout: {
          kind: 'pattern',
          highlight: true,
        },
      }
    );
  }

  public start(core: CoreStart, deps: DepStart) {}
  public stop() {
    this.event$.complete();
  }
}
