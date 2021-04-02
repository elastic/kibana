/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { uniq } from 'lodash';

import type { FeatureKibanaPrivileges } from '../../../../../features/server';
import { BaseFeaturePrivilegeBuilder } from './feature_privilege_builder';

const readOperations: string[] = ['get', 'find'];
const writeOperations: string[] = ['update'];
const allOperations: string[] = [...readOperations, ...writeOperations];

export class FeaturePrivilegeRacBuilder extends BaseFeaturePrivilegeBuilder {
  public getActions(privilegeDefinition: FeatureKibanaPrivileges, spaceId: string): string[] {
    const getRacPrivilege = (owners: readonly string[], operations: string[]) => {
      return owners.flatMap((owner) =>
        operations.map((operation) => this.actions.rac.get(spaceId, owner, operation))
      );
    };

    return uniq([
      ...getRacPrivilege(allOperations, privilegeDefinition.alerts?.all ?? []),
      ...getRacPrivilege(readOperations, privilegeDefinition.alerts?.read ?? []),
    ]);
  }
}
