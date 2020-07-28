/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RawKibanaPrivileges, RoleKibanaPrivilege } from '../../../../common/model';
import { KibanaPrivilege } from './kibana_privilege';
import { PrivilegeCollection } from './privilege_collection';
import { SecuredFeature } from './secured_feature';
import { Feature } from '../../../../../features/common';
import { isGlobalPrivilegeDefinition } from '../edit_role/privilege_utils';

function toBasePrivilege(entry: [string, string[]]): [string, KibanaPrivilege] {
  const [privilegeId, actions] = entry;
  return [privilegeId, new KibanaPrivilege(privilegeId, actions)];
}

function recordsToBasePrivilegeMap(
  record: Record<string, string[]>
): ReadonlyMap<string, KibanaPrivilege> {
  return new Map(Object.entries(record).map((entry) => toBasePrivilege(entry)));
}

export class KibanaPrivileges {
  private global: ReadonlyMap<string, KibanaPrivilege>;

  private spaces: ReadonlyMap<string, KibanaPrivilege>;

  private feature: ReadonlyMap<string, SecuredFeature>;

  constructor(rawKibanaPrivileges: RawKibanaPrivileges, features: Feature[]) {
    this.global = recordsToBasePrivilegeMap(rawKibanaPrivileges.global);
    this.spaces = recordsToBasePrivilegeMap(rawKibanaPrivileges.space);
    this.feature = new Map(
      features.map((feature) => {
        const rawPrivs = rawKibanaPrivileges.features[feature.id];
        return [feature.id, new SecuredFeature(feature.toRaw(), rawPrivs)];
      })
    );
  }

  public getBasePrivileges(entry: RoleKibanaPrivilege) {
    if (isGlobalPrivilegeDefinition(entry)) {
      return Array.from(this.global.values());
    }
    return Array.from(this.spaces.values());
  }

  public getSecuredFeature(featureId: string) {
    return this.feature.get(featureId)!;
  }

  public getSecuredFeatures() {
    return Array.from(this.feature.values());
  }

  public createCollectionFromRoleKibanaPrivileges(roleKibanaPrivileges: RoleKibanaPrivilege[]) {
    const filterAssigned = (assignedPrivileges: string[]) => (privilege: KibanaPrivilege) =>
      assignedPrivileges.includes(privilege.id);

    const privileges: KibanaPrivilege[] = roleKibanaPrivileges
      .map((entry) => {
        const assignedBasePrivileges = this.getBasePrivileges(entry).filter(
          filterAssigned(entry.base)
        );

        const assignedFeaturePrivileges: KibanaPrivilege[][] = Object.entries(entry.feature).map(
          ([featureId, assignedFeaturePrivs]) => {
            return this.getFeaturePrivileges(featureId).filter(
              filterAssigned(assignedFeaturePrivs)
            );
          }
        );

        return [assignedBasePrivileges, assignedFeaturePrivileges].flat(2);
      })
      .flat();

    return new PrivilegeCollection(privileges);
  }

  private getFeaturePrivileges(featureId: string) {
    return this.getSecuredFeature(featureId)?.getAllPrivileges() ?? [];
  }
}
