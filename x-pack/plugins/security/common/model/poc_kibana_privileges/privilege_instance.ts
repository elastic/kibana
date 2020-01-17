/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export type PrivilegeType = 'global_base' | 'space_base' | 'feature';

const rankedPrivilegeTypes: PrivilegeType[] = ['feature', 'space_base', 'global_base'];

export class Privilege {
  constructor(
    public readonly type: PrivilegeType,
    public readonly id: string,
    public readonly actions: string[]
  ) {}

  public grantsPrivilege(candidatePrivilege: Privilege) {
    return this.checkActions(this.actions, candidatePrivilege.actions);
  }

  public equals({ type, id }: Privilege) {
    return type === this.type && id === this.id;
  }

  public compareTo({ type, id }: Privilege) {
    if (this.type === type) {
      return 0;
    }
    for (const privilegeType of rankedPrivilegeTypes) {
      if (this.type === privilegeType) {
        return -1;
      }
      if (type === privilegeType) {
        return 1;
      }
    }

    throw new Error(`Unable to compare privilege against ${type}:${id}`);
  }

  private checkActions(knownActions: string[], candidateActions: string[]) {
    const missing = candidateActions.filter(action => !knownActions.includes(action));

    const hasAllRequested = missing.length === 0;

    return {
      missing,
      hasAllRequested,
    };
  }
}
