/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';

export class KibanaPrivilege {
  constructor(public readonly id: string, public readonly actions: string[] = []) {}

  public get name() {
    return _.upperFirst(this.id);
  }

  public grantsPrivilege(candidatePrivilege: KibanaPrivilege) {
    return this.checkActions(this.actions, candidatePrivilege.actions).hasAllRequested;
  }

  private checkActions(knownActions: string[], candidateActions: string[]) {
    const missing = candidateActions.filter((action) => !knownActions.includes(action));

    const hasAllRequested =
      knownActions.length > 0 && candidateActions.length > 0 && missing.length === 0;

    return {
      missing,
      hasAllRequested,
    };
  }
}
