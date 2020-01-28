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

  public without(...privileges: Array<Pick<Privilege, 'type' | 'id'>>) {
    return new PrivilegeCollection(
      this.privileges.filter(
        p =>
          !privileges.find(
            withoutPrivilege => p.type === withoutPrivilege.type && p.id === withoutPrivilege.id
          )
      )
    );
  }

  public filter(predicate: (privilege: Privilege) => boolean) {
    return new PrivilegeCollection(this.privileges.filter(predicate));
  }

  public includes(privilege: Privilege) {
    return this.privileges.includes(privilege);
  }

  public removeRedundant() {
    const privilegesToKeep: Privilege[] = [];

    this.privileges.forEach((privilege, index) => {
      const withoutPrivilege = this.filter(p => !p.equals(privilege));

      if (!withoutPrivilege.grantsPrivilege(privilege).hasAllRequested) {
        privilegesToKeep.push(privilege);
      }
    });

    return new PrivilegeCollection(privilegesToKeep);
  }

  public bisect(bisector: (privilege: Privilege) => 'first' | 'second') {
    const first: Privilege[] = [];
    const second: Privilege[] = [];

    this.privileges.forEach(privilege => {
      const result = bisector(privilege);
      switch (result) {
        case 'first':
          first.push(privilege);
          break;
        case 'second':
          second.push(privilege);
          break;
        default:
          throw new Error(`unsupported bisector return value: ${result}`);
      }
    });

    return [new PrivilegeCollection(first), new PrivilegeCollection(second)];
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
