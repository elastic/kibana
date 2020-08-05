/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KibanaPrivilege } from './kibana_privilege';

export class PrivilegeCollection {
  private actions: ReadonlySet<string>;

  constructor(privileges: KibanaPrivilege[]) {
    this.actions = new Set(
      privileges.reduce((acc, priv) => [...acc, ...priv.actions], [] as string[])
    );
  }

  public grantsPrivilege(privilege: KibanaPrivilege) {
    return this.checkActions(this.actions, privilege.actions).hasAllRequested;
  }

  private checkActions(knownActions: ReadonlySet<string>, candidateActions: string[]) {
    const missing = candidateActions.filter((action) => !knownActions.has(action));

    const hasAllRequested =
      knownActions.size > 0 && candidateActions.length > 0 && missing.length === 0;

    return {
      missing,
      hasAllRequested,
    };
  }
}
