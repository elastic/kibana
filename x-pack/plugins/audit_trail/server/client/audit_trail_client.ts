/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Subject } from 'rxjs';
import { KibanaRequest, Auditor, AuditableEvent } from 'src/core/server';
import { AuditEvent } from '../types';

import { SecurityPluginSetup } from '../../../security/server';
import { SpacesPluginSetup } from '../../../spaces/server';

interface Deps {
  getCurrentUser: SecurityPluginSetup['authc']['getCurrentUser'];
  getSpaceId?: SpacesPluginSetup['spacesService']['getSpaceId'];
}

export class AuditTrailClient implements Auditor {
  private scope?: string;
  constructor(
    private readonly request: KibanaRequest,
    private readonly event$: Subject<AuditEvent>,
    private readonly deps: Deps
  ) {}

  public withAuditScope(name: string) {
    if (this.scope !== undefined) {
      throw new Error(`Audit scope is already set to: ${this.scope}`);
    }
    this.scope = name;
  }

  public add(event: AuditableEvent) {
    const user = this.deps.getCurrentUser(this.request);
    // doesn't use getSpace since it's async operation calling ES
    const spaceId = this.deps.getSpaceId ? this.deps.getSpaceId(this.request) : undefined;

    this.event$.next({
      message: event.message,
      type: event.type,
      user: user?.username,
      space: spaceId,
      scope: this.scope,
    });
  }
}
