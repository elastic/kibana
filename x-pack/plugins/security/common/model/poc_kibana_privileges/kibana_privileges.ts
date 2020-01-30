/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Feature } from '../../../../features/public';
import { RawKibanaPrivileges } from '../raw_kibana_privileges';
import { Privilege, PrivilegeType, PrivilegeScope } from './privilege_instance';
import { PrivilegeCollection } from './privilege_collection';
import { RoleKibanaPrivilege } from '../role';
import { SecuredFeature } from '../secured_feature';

function toPrivilege(
  scope: PrivilegeScope,
  type: PrivilegeType,
  entry: [string, string[]]
): [string, Privilege] {
  const [privilegeId, actions] = entry;
  return [privilegeId, new Privilege(scope, type, privilegeId, actions)];
}

function recordsToPrivilegeMap(
  scope: PrivilegeScope,
  type: PrivilegeType,
  record: Record<string, string[]>
): ReadonlyMap<string, Privilege> {
  return new Map(Object.entries(record).map(entry => toPrivilege(scope, type, entry)));
}

export class KibanaPrivileges {
  private global: ReadonlyMap<string, Privilege>;

  private spaces: ReadonlyMap<string, Privilege>;

  private globalFeature: ReadonlyMap<string, SecuredFeature>;

  private spaceFeature: ReadonlyMap<string, SecuredFeature>;

  constructor(rawKibanaPrivileges: RawKibanaPrivileges, features: Feature[]) {
    this.global = recordsToPrivilegeMap('global', 'base', rawKibanaPrivileges.global);
    this.spaces = recordsToPrivilegeMap('space', 'base', rawKibanaPrivileges.space);
    this.globalFeature = new Map(
      features.map(feature => {
        const rawPrivs = rawKibanaPrivileges.features[feature.id];
        return [feature.id, new SecuredFeature(feature.toRaw(), rawPrivs, 'global')];
      })
    );
    this.spaceFeature = new Map(
      features.map(feature => {
        const rawPrivs = rawKibanaPrivileges.features[feature.id];
        return [feature.id, new SecuredFeature(feature.toRaw(), rawPrivs, 'space')];
      })
    );
  }

  public getBasePrivileges(scope: PrivilegeScope) {
    switch (scope) {
      case 'global':
        return Array.from(this.global.values());
      case 'space':
        return Array.from(this.spaces.values());
      default:
        throw new Error(`Unsupported scope: ${scope}`);
    }
  }

  public getSecuredFeature(scope: PrivilegeScope, featureId: string) {
    switch (scope) {
      case 'global':
        return this.globalFeature.get(featureId)!;
      case 'space':
        return this.spaceFeature.get(featureId)!;
      default:
        throw new Error(`Unsupported scope: ${scope}`);
    }
  }

  public getSecuredFeatures(scope: PrivilegeScope) {
    switch (scope) {
      case 'global':
        return Array.from(this.globalFeature.values());
      case 'space':
        return Array.from(this.spaceFeature.values());
      default:
        throw new Error(`Unsupported scope: ${scope}`);
    }
  }

  public getFeaturePrivileges(scope: PrivilegeScope, featureId: string) {
    return this.getSecuredFeature(scope, featureId).allPrivileges ?? [];
  }

  public createCollectionFromRoleKibanaPrivileges(roleKibanaPrivileges: RoleKibanaPrivilege[]) {
    const filterAssigned = (assignedPrivileges: string[]) => (privilege: Privilege) =>
      assignedPrivileges.includes(privilege.id);

    const privileges: Privilege[] = roleKibanaPrivileges
      .map(rkp => {
        const basePrivileges = this.getBasePrivileges(this.getScope(rkp)).filter(
          filterAssigned(rkp.base)
        );
        const featurePrivileges: Privilege[][] = Object.entries(rkp.feature).map(
          ([featureId, assignedFeaturePrivs]) => {
            return this.getFeaturePrivileges(this.getScope(rkp), featureId).filter(
              filterAssigned(assignedFeaturePrivs)
            );
          }
        );

        return [basePrivileges, featurePrivileges].flat<Privilege>(2);
      })
      .flat<Privilege>();

    return new PrivilegeCollection(privileges);
  }

  // TODO: Consolidate definition with the one inbside the edit role screen
  private isGlobalPrivilegeDefinition(privilegeSpec: RoleKibanaPrivilege): boolean {
    if (!privilegeSpec.spaces || privilegeSpec.spaces.length === 0) {
      return true;
    }
    return privilegeSpec.spaces.includes('*');
  }

  private getScope(privilegeSpec: RoleKibanaPrivilege): Privilege['scope'] {
    if (this.isGlobalPrivilegeDefinition(privilegeSpec)) {
      return 'global';
    }
    return 'space';
  }
}
