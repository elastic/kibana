/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Subject } from 'rxjs';
import {
  CoreSetup,
  CoreStart,
  KibanaRequest,
  Logger,
  Plugin,
  PluginInitializerContext,
} from 'src/core/server';

import { AuditEvent } from './types';
import { AuditTrailClient } from './services/audit_trail_client';

import { SecurityPluginSetup } from '../../security/server';
import { SpacesPluginSetup } from '../../spaces/server';

interface DepsSetup {
  security: SecurityPluginSetup;
  spaces: SpacesPluginSetup;
}

export class AuditTrailPlugin implements Plugin {
  private readonly logger: Logger;

  constructor(private readonly context: PluginInitializerContext) {
    this.logger = this.context.logger.get();
  }

  public async setup(core: CoreSetup, deps: DepsSetup) {
    const depsApi = {
      getCurrentUser: deps.security.authc.getCurrentUser,
      getActiveSpace: deps.spaces.spacesService.getActiveSpace,
    };

    const event$ = new Subject<AuditEvent>();
    event$.subscribe(({ message, ...other }) => this.logger.debug(message, other));

    core.auditTrail.register({
      asScoped(request: KibanaRequest) {
        return new AuditTrailClient(request, event$, depsApi);
      },
    });
  }

  public start(core: CoreStart) {}
}
