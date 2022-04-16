/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { flatten, uniq } from 'lodash';

import type { FeatureKibanaPrivileges } from '@kbn/features-plugin/server';

import { BaseFeaturePrivilegeBuilder } from './feature_privilege_builder';

const readOperations: string[] = [
  'bulk_get',
  'get',
  'find',
  'open_point_in_time',
  'close_point_in_time',
];
const writeOperations: string[] = [
  'create',
  'bulk_create',
  'update',
  'bulk_update',
  'delete',
  'share_to_space',
];
const allOperations: string[] = [...readOperations, ...writeOperations];

export class FeaturePrivilegeSavedObjectBuilder extends BaseFeaturePrivilegeBuilder {
  public getActions(privilegeDefinition: FeatureKibanaPrivileges): string[] {
    return uniq([
      ...flatten(
        privilegeDefinition.savedObject.all.map((type) => [
          ...allOperations.map((operation) => this.actions.savedObject.get(type, operation)),
        ])
      ),
      ...flatten(
        privilegeDefinition.savedObject.read.map((type) => [
          ...readOperations.map((operation) => this.actions.savedObject.get(type, operation)),
        ])
      ),
    ]);
  }
}
