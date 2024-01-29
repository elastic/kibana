/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { uniq } from 'lodash';

import type { FeatureKibanaPrivileges, KibanaFeature } from '@kbn/features-plugin/server';

import { BaseFeaturePrivilegeBuilder } from './feature_privilege_builder';

export type CasesSupportedOperations = typeof allOperations[number];

/**
 * If you add a new operation type (all, push, update, etc) you should also
 * extend the mapping here x-pack/plugins/features/server/feature_privilege_iterator/feature_privilege_iterator.ts
 *
 * Also if you add a new operation (createCase, updateCase, etc) here you'll likely also need to make changes here:
 * x-pack/plugins/cases/server/authorization/index.ts
 */

const pushOperations = ['pushCase'] as const;
const createOperations = ['createCase', 'createComment'] as const;
const readOperations = [
  'getCase',
  'getComment',
  'getTags',
  'getReporters',
  'getUserActions',
  'findConfigurations',
] as const;
const updateOperations = ['updateCase', 'updateComment'] as const;
const deleteOperations = ['deleteCase', 'deleteComment'] as const;
const settingsOperations = ['createConfiguration', 'updateConfiguration'] as const;
const allOperations = [
  ...pushOperations,
  ...createOperations,
  ...readOperations,
  ...updateOperations,
  ...deleteOperations,
  ...settingsOperations,
] as const;

export class FeaturePrivilegeCasesBuilder extends BaseFeaturePrivilegeBuilder {
  public getActions(
    privilegeDefinition: FeatureKibanaPrivileges,
    feature: KibanaFeature
  ): string[] {
    const getCasesPrivilege = (
      operations: readonly CasesSupportedOperations[],
      owners: readonly string[] = []
    ) => {
      return owners.flatMap((owner) =>
        operations.map((operation) => this.actions.cases.get(owner, operation))
      );
    };

    return uniq([
      ...getCasesPrivilege(allOperations, privilegeDefinition.cases?.all),
      ...getCasesPrivilege(pushOperations, privilegeDefinition.cases?.push),
      ...getCasesPrivilege(createOperations, privilegeDefinition.cases?.create),
      ...getCasesPrivilege(readOperations, privilegeDefinition.cases?.read),
      ...getCasesPrivilege(updateOperations, privilegeDefinition.cases?.update),
      ...getCasesPrivilege(deleteOperations, privilegeDefinition.cases?.delete),
      ...getCasesPrivilege(settingsOperations, privilegeDefinition.cases?.settings),
    ]);
  }
}
