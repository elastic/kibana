/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Subject } from 'rxjs';
import { KibanaRequest, Auditor } from 'src/core/server';
import { AuditableEvent, AuditEvent } from '../types';

import { SecurityPluginSetup } from '../../../security/server';
import { SpacesPluginSetup } from '../../../spaces/server';

interface Deps {
  getCurrentUser: SecurityPluginSetup['authc']['getCurrentUser'];
  getActiveSpace: SpacesPluginSetup['spacesService']['getActiveSpace'];
}

function tail<T = any>(array: T[]) {
  return array[array.length - 1];
}

async function safeCall<T>(fn: () => T): Promise<T | undefined> {
  try {
    return await fn();
  } catch {
    return;
  }
}

export class AuditTrailClient implements Auditor {
  private readonly scope: string[] = [];
  constructor(
    private readonly request: KibanaRequest,
    private readonly event$: Subject<AuditEvent>,
    private readonly deps: Deps
  ) {}

  openScope(name: string) {
    if (this.scope.includes(name)) {
      throw new Error(`"${name}" scope is already opened`);
    }
    this.scope.push(name);
  }

  closeScope(name: string) {
    if (tail(this.scope) !== name) {
      throw new Error(`Cannot close ${name} scope`);
    }
    this.scope.shift();
  }

  async add(event: AuditableEvent) {
    const user = await safeCall(() => this.deps.getCurrentUser(this.request));
    const space = await safeCall(() => this.deps.getActiveSpace(this.request));

    this.event$.next({
      message: event.message,
      type: event.type,
      user: user?.username,
      space: space?.name,
    });
  }
}
