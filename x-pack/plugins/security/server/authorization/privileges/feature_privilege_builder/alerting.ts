/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { uniq } from 'lodash';
import { KibanaFeature, FeatureKibanaPrivileges } from '../../../../../features/server';
import { BaseFeaturePrivilegeBuilder } from './feature_privilege_builder';

const readOperations: string[] = ['get', 'getAlertState', 'getAlertInstanceSummary', 'find'];
const writeOperations: string[] = [
  'create',
  'delete',
  'update',
  'updateApiKey',
  'enable',
  'disable',
  'muteAll',
  'unmuteAll',
  'muteInstance',
  'unmuteInstance',
];
const allOperations: string[] = [...readOperations, ...writeOperations];

export class FeaturePrivilegeAlertingBuilder extends BaseFeaturePrivilegeBuilder {
  public getActions(
    privilegeDefinition: FeatureKibanaPrivileges,
    feature: KibanaFeature
  ): string[] {
    const getAlertingPrivilege = (
      operations: string[],
      privilegedTypes: readonly string[],
      consumer: string
    ) =>
      privilegedTypes.flatMap((type) =>
        operations.map((operation) => this.actions.alerting.get(type, consumer, operation))
      );

    return uniq([
      ...getAlertingPrivilege(allOperations, privilegeDefinition.alerting?.all ?? [], feature.id),
      ...getAlertingPrivilege(readOperations, privilegeDefinition.alerting?.read ?? [], feature.id),
    ]);
  }
}
