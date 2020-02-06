/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Privilege } from './privilege_instance';

export class PrivilegeCollection {
  private actions: ReadonlySet<string>;

  constructor(private readonly privileges: Privilege[]) {
    this.actions = new Set(
      privileges.reduce((acc, priv) => [...acc, ...priv.actions], [] as string[])
    );
  }

  public grantsPrivilege(privilege: Privilege) {
    return this.checkActions(this.actions, privilege.actions);
  }

  public getPrivilegesGranting(privilege: Privilege) {
    return this.privileges.filter(p => p.grantsPrivilege(privilege).hasAllRequested);
  }

  public subtract(otherCollection: PrivilegeCollection) {
    return new PrivilegeCollection(this.privileges.filter(p => !otherCollection.includes(p)));
  }

  public filter(predicate: (privilege: Privilege) => boolean) {
    return new PrivilegeCollection(this.privileges.filter(predicate));
  }

  public includes(privilege: Privilege) {
    return this.privileges.some(p => p.equals(privilege));
  }

  private checkActions(knownActions: ReadonlySet<string>, candidateActions: string[]) {
    const missing = candidateActions.filter(action => !knownActions.has(action));

    const hasAllRequested = knownActions.size > 0 && missing.length === 0;

    return {
      missing,
      hasAllRequested,
    };
  }
}
