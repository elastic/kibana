/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export type PrivilegeType = 'global_base' | 'space_base' | 'feature';

export class Privilege {
  constructor(
    public readonly type: PrivilegeType,
    public readonly id: string,
    public readonly actions: string[]
  ) {}

  public grantsActions(candidateActions: string[]) {
    return this.checkActions(this.actions, candidateActions);
  }

  public isGrantedByActions(grantedActions: string[]) {
    return this.checkActions(grantedActions, this.actions);
  }

  public equals({ type, id }: Privilege) {
    return type === this.type && id === this.id;
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
