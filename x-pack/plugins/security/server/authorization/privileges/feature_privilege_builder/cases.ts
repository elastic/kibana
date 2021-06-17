/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { uniq } from 'lodash';

import type { FeatureKibanaPrivileges, KibanaFeature } from '../../../../../features/server';
import { BaseFeaturePrivilegeBuilder } from './feature_privilege_builder';

// if you add a value here you'll likely also need to make changes here:
// x-pack/plugins/cases/server/authorization/index.ts
const readOperations: string[] = [
  'getCase',
  'getComment',
  'getTags',
  'getReporters',
  'getUserActions',
  'findConfigurations',
];
const writeOperations: string[] = [
  'createCase',
  'deleteCase',
  'updateCase',
  'pushCase',
  'createComment',
  'deleteComment',
  'updateComment',
  'createConfiguration',
  'updateConfiguration',
];
const allOperations: string[] = [...readOperations, ...writeOperations];

export class FeaturePrivilegeCasesBuilder extends BaseFeaturePrivilegeBuilder {
  public getActions(
    privilegeDefinition: FeatureKibanaPrivileges,
    feature: KibanaFeature
  ): string[] {
    const getCasesPrivilege = (operations: string[], owners: readonly string[]) => {
      return owners.flatMap((owner) =>
        operations.map((operation) => this.actions.cases.get(owner, operation))
      );
    };

    return uniq([
      ...getCasesPrivilege(allOperations, privilegeDefinition.cases?.all ?? []),
      ...getCasesPrivilege(readOperations, privilegeDefinition.cases?.read ?? []),
    ]);
  }
}
