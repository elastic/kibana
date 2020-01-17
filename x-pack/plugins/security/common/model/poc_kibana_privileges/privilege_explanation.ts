/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ScopedPrivilege } from './scoped_privilege';

export class PrivilegeExplanation {
  constructor(
    public readonly privilege: ScopedPrivilege,
    private readonly calculation: {
      global: ScopedPrivilege[];
      space: ScopedPrivilege[];
    }
  ) {}

  public isGranted() {
    const { global, space } = this.calculation;

    return global.length > 0 || space.length > 0;
  }

  public isDirectlyAssigned() {
    return (
      this.calculation.global.some(gp => gp.equals(this.privilege)) ||
      this.calculation.space.some(sp => sp.equals(this.privilege))
    );
  }

  public canUnassign() {
    return !this.isInherited();
  }

  public isInherited() {
    const { global, space } = this.calculation;

    const indirectPrivileges = [
      global.filter(privilege => !privilege.equals(this.privilege)),
      space.filter(privilege => !privilege.equals(this.privilege)),
    ].flat();

    return indirectPrivileges.length > 0;
  }

  public getGrantSource() {
    const rankedSources = [this.calculation.global, this.calculation.space]
      .flat()
      .sort((p1, p2) => p1.compareTo(p2));

    return rankedSources.length > 0 ? rankedSources[0] : undefined;
  }
}
