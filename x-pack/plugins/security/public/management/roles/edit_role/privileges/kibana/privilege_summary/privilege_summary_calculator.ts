/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Role, RoleKibanaPrivilege } from '../../../../../../../common/model';
import { isGlobalPrivilegeDefinition } from '../../../privilege_utils';
import { KibanaPrivileges, PrimaryFeaturePrivilege, SecuredFeature } from '../../../../model';
import { PrivilegeCollection } from '../../../../model/privilege_collection';

export interface EffectiveFeaturePrivileges {
  [featureId: string]: {
    primary?: PrimaryFeaturePrivilege;
    subFeature: string[];
    hasNonSupersededSubFeaturePrivileges: boolean;
  };
}
export class PrivilegeSummaryCalculator {
  constructor(private readonly kibanaPrivileges: KibanaPrivileges, private readonly role: Role) {}

  public getEffectiveFeaturePrivileges(entry: RoleKibanaPrivilege): EffectiveFeaturePrivileges {
    const assignedPrivileges = this.collectAssignedPrivileges(entry);

    const features = this.kibanaPrivileges.getSecuredFeatures();

    return features.reduce((acc, feature) => {
      const displayedPrimaryFeaturePrivilege = this.getDisplayedPrimaryFeaturePrivilege(
        assignedPrivileges,
        feature
      );

      const effectiveSubPrivileges = feature
        .getSubFeaturePrivileges()
        .filter(ap => assignedPrivileges.grantsPrivilege(ap));

      const hasNonSupersededSubFeaturePrivileges = effectiveSubPrivileges.some(
        esp => !displayedPrimaryFeaturePrivilege?.grantsPrivilege(esp)
      );

      return {
        ...acc,
        [feature.id]: {
          primary: displayedPrimaryFeaturePrivilege,
          hasNonSupersededSubFeaturePrivileges,
          subFeature: effectiveSubPrivileges.map(p => p.id),
        },
      };
    }, {} as EffectiveFeaturePrivileges);
  }

  private getDisplayedPrimaryFeaturePrivilege(
    assignedPrivileges: PrivilegeCollection,
    feature: SecuredFeature
  ) {
    const primaryFeaturePrivileges = feature.getPrimaryFeaturePrivileges();
    const minimalPrimaryFeaturePrivileges = feature.getMinimalFeaturePrivileges();

    const hasMinimalPrivileges = feature.subFeatures.length > 0;

    const effectivePrivilege = primaryFeaturePrivileges.find(pfp => {
      const isPrimaryGranted = assignedPrivileges.grantsPrivilege(pfp);
      if (!isPrimaryGranted && hasMinimalPrivileges) {
        const correspindingMinimal = minimalPrimaryFeaturePrivileges.find(
          mpfp => mpfp.id === pfp.getCorrespondingPrivilegeId()
        )!;

        return assignedPrivileges.grantsPrivilege(correspindingMinimal);
      }
      return isPrimaryGranted;
    });

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
