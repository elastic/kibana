/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { uniq } from 'lodash';

import type { FeatureKibanaPrivileges } from '../../../../../features/server';
import { BaseFeaturePrivilegeBuilder } from './feature_privilege_builder';

// TODO: Sync with Larry/team to figure out best method of passing in
// and checking space id since we're not dealing with saved objects for alerts
// ie: mimicking spaces in data index
const spaceId: string = 'default';
const readOperations: string[] = ['get', 'find'];
const writeOperations: string[] = ['update'];
const allOperations: string[] = [...readOperations, ...writeOperations];

export class FeaturePrivilegeRacBuilder extends BaseFeaturePrivilegeBuilder {
  // TODO: Figure out if we need to pass in KibanaFeature id here
  public getActions(privilegeDefinition: FeatureKibanaPrivileges): string[] {
    /**
     * Returns the operator type, may not need this if using io-ts types
     *
     * @param operations all CRUD operations to check privileges for
     * @param owners plugin or feature registered with RAC whose rule generate alerts
     */
    const getAlertingPrivilege = (operations: string[], owners: readonly string[]) =>
      owners.flatMap((owner) =>
        operations.map((operation) => this.actions.rac.get(owner, operation))
      );

    return uniq([
      ...getAlertingPrivilege(allOperations, privilegeDefinition.rac?.all ?? []),
      ...getAlertingPrivilege(readOperations, privilegeDefinition.rac?.read ?? []),
    ]);
  }
}
