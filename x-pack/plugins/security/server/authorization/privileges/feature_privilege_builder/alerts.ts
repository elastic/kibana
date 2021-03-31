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

export class FeaturePrivilegeAlertsBuilder extends BaseFeaturePrivilegeBuilder {
  public getActions(privilegeDefinition: FeatureKibanaPrivileges): string[] {
    const getAlertsPrivilege = (operations: string[], owners: readonly string[]) => {
      return owners.flatMap((owner) =>
        operations.map((operation) => this.actions.alerts.get(operation, owner))
      );
    };

    return uniq([
      ...getAlertsPrivilege(allOperations, privilegeDefinition.alerts?.all ?? []),
      ...getAlertsPrivilege(readOperations, privilegeDefinition.alerts?.read ?? []),
    ]);
  }
}
