/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Privilege } from './poc_kibana_privileges';

export class ScopedPrivilege {
  constructor(public readonly scope: 'global' | 'space', public readonly privilege: Privilege) {}

  public equals(other: ScopedPrivilege) {
    return this.scope === other.scope && this.privilege.equals(other.privilege);
  }

  public isParentScopeOf(scopedPrivilege: ScopedPrivilege) {
    return this.scope === 'global' && scopedPrivilege.scope === 'space';
  }
}
