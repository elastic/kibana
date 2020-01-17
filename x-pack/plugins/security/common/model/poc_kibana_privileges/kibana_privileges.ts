/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isGlobalPrivilegeDefinition } from 'plugins/security/lib/privilege_utils';
import { RawKibanaPrivileges } from '../raw_kibana_privileges';
import { Privilege, PrivilegeType } from './privilege_instance';
import { PrivilegeCollection } from './privilege_collection';
import { RoleKibanaPrivilege } from '../role';

function toPrivilege(type: PrivilegeType, entry: [string, string[]]): [string, Privilege] {
  const [privilegeId, actions] = entry;
  return [privilegeId, new Privilege(type, privilegeId, actions)];
}

function recordsToPrivilegeMap(
  type: PrivilegeType,
  record: Record<string, string[]>
): ReadonlyMap<string, Privilege> {
  return new Map(Object.entries(record).map(entry => toPrivilege(type, entry)));
}

export class KibanaPrivileges {
  private global: ReadonlyMap<string, Privilege>;

  private spaces: ReadonlyMap<string, Privilege>;

  private feature: ReadonlyMap<string, ReadonlyMap<string, Privilege>>;

  constructor(rawKibanaPrivileges: RawKibanaPrivileges) {
    this.global = recordsToPrivilegeMap('global_base', rawKibanaPrivileges.global);
    this.spaces = recordsToPrivilegeMap('space_base', rawKibanaPrivileges.space);
    this.feature = new Map(
      Object.entries(rawKibanaPrivileges.features).map(rawFeature => {
        const [featureId, featurePrivileges] = rawFeature;
        return [featureId, recordsToPrivilegeMap('feature', featurePrivileges)];
      })
    );
  }

  public getGlobalPrivileges() {
    return Array.from(this.global.values());
  }

  public getSpacesPrivileges() {
    return Array.from(this.spaces.values());
  }

  public getAllFeaturePrivileges() {
    return this.feature;
  }

  public getFeaturePrivileges(featureId: string) {
    if (this.feature.has(featureId)) {
      return Array.from(this.feature.get(featureId)!.values());
    }
    return [];
  }

  public createCollectionFromRoleKibanaPrivileges(roleKibanaPrivileges: RoleKibanaPrivilege[]) {
    const filterAssigned = (assignedPrivileges: string[]) => (privilege: Privilege) =>
      assignedPrivileges.includes(privilege.id);

    const privileges: Privilege[] = roleKibanaPrivileges
      .map(rkp => {
        let basePrivileges: Privilege[];
        if (isGlobalPrivilegeDefinition(rkp)) {
          basePrivileges = this.getGlobalPrivileges().filter(filterAssigned(rkp.base));
        } else {
          basePrivileges = this.getSpacesPrivileges().filter(filterAssigned(rkp.base));
        }

        const featurePrivileges: Privilege[][] = Object.entries(rkp.feature).map(
          ([featureId, assignedFeaturePrivs]) => {
            return this.getFeaturePrivileges(featureId).filter(
              filterAssigned(assignedFeaturePrivs)
            );
          }
        );

        return [basePrivileges, featurePrivileges].flat<Privilege>(2);
      })
      .flat<Privilege>();

    return new PrivilegeCollection(privileges);
  }
}
