/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  KibanaPrivileges,
  Role,
  SubFeaturePrivilege,
  SubFeaturePrivilegeGroup,
  RoleKibanaPrivilege,
  PrimaryFeaturePrivilege,
} from '../../../../../../../common/model';
import { isGlobalPrivilegeDefinition } from '../../../privilege_utils';

export class PrivilegeSummaryCalculator {
  constructor(private readonly kibanaPrivileges: KibanaPrivileges, private readonly role: Role) {}

  public getEffectivePrimaryFeaturePrivilege(entry: RoleKibanaPrivilege) {
    const assignedPrivileges = this.collectAssignedPrivileges(entry);

    const features = this.kibanaPrivileges.getSecuredFeatures();

    return features.reduce((acc, feature) => {
      const effectivePrivilege =
        feature.primaryFeaturePrivileges.find(
          pfp => assignedPrivileges.grantsPrivilege(pfp).hasAllRequested
        ) ||
        feature.minimalPrimaryFeaturePrivileges.find(
          pfp => assignedPrivileges.grantsPrivilege(pfp).hasAllRequested
        );

      return {
        ...acc,
        [feature.id]: effectivePrivilege,
      };
    }, {} as Record<string, PrimaryFeaturePrivilege | undefined>);
  }

  public getEffectiveSubFeaturePrivileges(entry: RoleKibanaPrivilege, featureId: string) {
    const feature = this.kibanaPrivileges.getSecuredFeature(featureId);

    const assignedPrivileges = this.collectAssignedPrivileges(entry);

    return feature.subFeaturePrivileges.filter(
      sfp => assignedPrivileges.grantsPrivilege(sfp).hasAllRequested
    );
  }

  public getEffectiveFeaturePrivileges(entry: RoleKibanaPrivilege) {
    const assignedPrivileges = this.collectAssignedPrivileges(entry);

    const features = this.kibanaPrivileges.getSecuredFeatures();

    return features.reduce((acc, feature) => {
      const effectivePrimaryFeaturePrivilege =
        feature.primaryFeaturePrivileges.find(
          pfp => assignedPrivileges.grantsPrivilege(pfp).hasAllRequested
        ) ||
        feature.minimalPrimaryFeaturePrivileges.find(
          pfp => assignedPrivileges.grantsPrivilege(pfp).hasAllRequested
        );

      const effectiveSubPrivileges = feature.subFeaturePrivileges.filter(
        ap => assignedPrivileges.grantsPrivilege(ap).hasAllRequested
      );

      const hasNonSupersededSubFeaturePrivileges = effectiveSubPrivileges.some(
        esp => !effectivePrimaryFeaturePrivilege?.grantsPrivilege(esp).hasAllRequested
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

  public isIndependentSubFeaturePrivilegeGranted(featureId: string, privilegeId: string) {
    const primaryFeaturePrivilege = this.getEffectivePrimaryFeaturePrivilege(featureId);
    if (!primaryFeaturePrivilege) {
      return false;
    }
    const selectedFeaturePrivileges = this.getSelectedFeaturePrivileges(featureId);

    const feature = this.kibanaPrivileges.getSecuredFeature(featureId);

    const subFeaturePrivilege = feature.allPrivileges.find(
      ap => ap instanceof SubFeaturePrivilege && ap.id === privilegeId
    ) as SubFeaturePrivilege;

    return Boolean(
      primaryFeaturePrivilege.grantsPrivilege(subFeaturePrivilege).hasAllRequested ||
        selectedFeaturePrivileges.includes(subFeaturePrivilege.id)
    );
  }

  public getSelectedMutuallyExclusiveSubFeaturePrivilege(
    featureId: string,
    subFeatureGroup: SubFeaturePrivilegeGroup
  ) {
    const primaryFeaturePrivilege = this.getEffectivePrimaryFeaturePrivilege(featureId);
    if (!primaryFeaturePrivilege) {
      return undefined;
    }

    const selectedFeaturePrivileges = this.getSelectedFeaturePrivileges(featureId);

    return subFeatureGroup.privileges.find(p => {
      return (
        primaryFeaturePrivilege.grantsPrivilege(p).hasAllRequested ||
        selectedFeaturePrivileges.includes(p.id)
      );
    });
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
