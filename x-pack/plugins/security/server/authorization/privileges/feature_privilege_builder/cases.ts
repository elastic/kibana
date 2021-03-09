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
    const getCasesPrivilege = (operations: string[], consumer: string) =>
      operations.map((operation) => this.actions.cases.get(consumer, operation));

    // TODO: make sure we don't need to add a cases array or flag? to the FeatureKibanaPrivileges
    // I think we'd only need to do that if we wanted a plugin to be able to get permissions for cases from other plugins?
    // I think we only want the plugin to get access to the cases that are created through itself and not allow it to have
    // access to other plugins

    // It may make sense to add a cases field as a flag so plugins have to opt in to getting access to cases
    return uniq([
      ...getCasesPrivilege(allOperations, feature.id),
      ...getCasesPrivilege(readOperations, feature.id),
    ]);
  }
}
