/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { uniq } from 'lodash';

import type { FeatureKibanaPrivileges, KibanaFeature } from '../../../../../features/server';
import { BaseFeaturePrivilegeBuilder } from './feature_privilege_builder';

const readOperations: string[] = ['get', 'find'];
const writeOperations: string[] = ['create', 'delete', 'update'];
const allOperations: string[] = [...readOperations, ...writeOperations];

export class FeaturePrivilegeCasesBuilder extends BaseFeaturePrivilegeBuilder {
  public getActions(
    privilegeDefinition: FeatureKibanaPrivileges,
    feature: KibanaFeature
  ): string[] {
    const getCasesPrivilege = (operations: string[], classes: readonly string[]) => {
      return classes.flatMap((className) =>
        operations.map((operation) => this.actions.cases.get(className, operation))
      );
    };

    return uniq([
      ...getCasesPrivilege(allOperations, privilegeDefinition.cases?.all ?? []),
      ...getCasesPrivilege(readOperations, privilegeDefinition.cases?.read ?? []),
    ]);
  }
}
