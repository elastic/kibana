/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Role, RoleKibanaPrivilege } from '../../../../../../../common/model';
import { isGlobalPrivilegeDefinition } from '../../../privilege_utils';
import { KibanaPrivileges, PrimaryFeaturePrivilege, SecuredFeature } from '../../../../model';
import { PrivilegeCollection } from '../../../../model/kibana_privileges/privilege_collection';

export class PrivilegeSummaryCalculator {
  constructor(private readonly kibanaPrivileges: KibanaPrivileges, private readonly role: Role) {}

  public getEffectivePrimaryFeaturePrivileges(entry: RoleKibanaPrivilege) {
    const assignedPrivileges = this.collectAssignedPrivileges(entry);

    const features = this.kibanaPrivileges.getSecuredFeatures();

    return features.reduce((acc, feature) => {
      return {
        ...acc,
        [feature.id]: this.getEffectivePrimaryFeaturePrivilege(assignedPrivileges, feature),
      };
    }, {} as Record<string, PrimaryFeaturePrivilege | undefined>);
  }

  public getEffectiveSubFeaturePrivileges(entry: RoleKibanaPrivilege, featureId: string) {
    const feature = this.kibanaPrivileges.getSecuredFeature(featureId);

    const assignedPrivileges = this.collectAssignedPrivileges(entry);

    return feature.getSubFeaturePrivileges().filter(sfp => assignedPrivileges.grantsPrivilege(sfp));
  }

  public getEffectiveFeaturePrivileges(entry: RoleKibanaPrivilege) {
    const assignedPrivileges = this.collectAssignedPrivileges(entry);

    const features = this.kibanaPrivileges.getSecuredFeatures();

    return features.reduce((acc, feature) => {
      const effectivePrimaryFeaturePrivilege = this.getEffectivePrimaryFeaturePrivilege(
        assignedPrivileges,
        feature
      );

      const effectiveSubPrivileges = feature
        .getSubFeaturePrivileges()
        .filter(ap => assignedPrivileges.grantsPrivilege(ap));

      const hasNonSupersededSubFeaturePrivileges = effectiveSubPrivileges.some(
        esp => !effectivePrimaryFeaturePrivilege?.grantsPrivilege(esp)
      );

      return {
        ...acc,
        [feature.id]: {
          primary: effectivePrimaryFeaturePrivilege,
          hasNonSupersededSubFeaturePrivileges,
          subFeature: effectiveSubPrivileges.map(p => p.id),
        },
      };
    }, {} as Record<string, { primary?: PrimaryFeaturePrivilege; hasNonSupersededSubFeaturePrivileges: boolean; subFeature: string[] }>);
  }

  private getEffectivePrimaryFeaturePrivilege(
    assignedPrivileges: PrivilegeCollection,
    feature: SecuredFeature
  ) {
    const primaryFeaturePrivileges = feature.getPrimaryFeaturePrivileges();
    const minimalPrimaryFeaturePrivileges = feature.getMinimalFeaturePrivileges();

    // Order matters here. A non-minimal privileges by definition also grants the minimal version of itself,
    // and we want to return the most-permissive privilege.
    const effectivePrivilege =
      primaryFeaturePrivileges.find(pfp => assignedPrivileges.grantsPrivilege(pfp)) ||
      minimalPrimaryFeaturePrivileges.find(pfp => assignedPrivileges.grantsPrivilege(pfp));

    return effectivePrivilege;
  }

  private collectAssignedPrivileges(entry: RoleKibanaPrivilege) {
    if (isGlobalPrivilegeDefinition(entry)) {
      return this.kibanaPrivileges.createCollectionFromRoleKibanaPrivileges([entry]);
    }

    const globalPrivilege = this.locateGlobalPrivilege(this.role);
    return this.kibanaPrivileges.createCollectionFromRoleKibanaPrivileges(
      globalPrivilege ? [globalPrivilege, entry] : [entry]
    );
  }

  private locateGlobalPrivilege(role: Role) {
    return role.kibana.find(entry => isGlobalPrivilegeDefinition(entry));
  }
}
