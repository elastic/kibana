/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Privilege } from './privilege_instance';

export class ScopedPrivilege extends Privilege {
  constructor(public readonly scope: 'global' | 'space', privilege: Privilege) {
    super(privilege.type, privilege.id, privilege.actions);
  }

  public equals(other: ScopedPrivilege) {
    return other.scope === this.scope && super.equals(other);
  }

  public compareTo(other: ScopedPrivilege) {
    if (this.scope === 'space' && other.scope === 'global') {
      return -1;
    }
    if (this.scope === 'global' && other.scope === 'space') {
      return 1;
    }
    return super.compareTo(other);
  }
}
