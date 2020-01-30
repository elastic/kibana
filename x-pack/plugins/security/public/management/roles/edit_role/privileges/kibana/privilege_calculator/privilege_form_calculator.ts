/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PrivilegeScope } from '../../../../../../../common/model/poc_kibana_privileges/privilege_instance';
import {
  KibanaPrivileges,
  Role,
  SubFeaturePrivilege,
  SubFeaturePrivilegeGroup,
} from '../../../../../../../common/model';
import { isGlobalPrivilegeDefinition } from '../../../privilege_utils';

export class PrivilegeFormCalculator {
  private privilegeScope: PrivilegeScope;
  constructor(
    private readonly kibanaPrivileges: KibanaPrivileges,
    private readonly role: Role,
    private readonly editingIndex: number
  ) {
    this.privilegeScope = isGlobalPrivilegeDefinition(role.kibana[editingIndex])
      ? 'global'
      : 'space';
  }

  public getSecuredFeatures() {
    return this.kibanaPrivileges.getSecuredFeatures(this.privilegeScope);
  }

  public getFeaturePrivileges(featureId: string) {
    return this.kibanaPrivileges.getFeaturePrivileges(this.privilegeScope, featureId);
  }

  public getBasePrivilege() {
    const { base } = this.role.kibana[this.editingIndex];

    const basePrivileges = this.kibanaPrivileges.getBasePrivileges(this.privilegeScope);
    return basePrivileges.find(bp => base.includes(bp.id));
  }

  public getDisplayedPrimaryFeaturePrivilege(featureId: string) {
    const feature = this.kibanaPrivileges.getSecuredFeature(this.privilegeScope, featureId);

    const basePrivilege = this.getBasePrivilege();

    const selectedFeaturePrivileges = this.getSelectedFeaturePrivileges(featureId);

    return feature.primaryFeaturePrivileges.find(fp => {
      return (
        selectedFeaturePrivileges.includes(fp.id) ||
        selectedFeaturePrivileges.includes(`minimal_${fp.id}`) ||
        basePrivilege?.grantsPrivilege(fp).hasAllRequested
      );
    });
  }

  public hasNonSupersededSubFeaturePrivileges(featureId: string) {
    // We don't want the true effective primary here.
    // We want essentially the non-minimal version of whatever the primary happens to be.
    const displayedPrimary = this.getDisplayedPrimaryFeaturePrivilege(featureId);

    const formPrivileges = this.kibanaPrivileges.createCollectionFromRoleKibanaPrivileges([
      this.role.kibana[this.editingIndex],
    ]);

    const feature = this.kibanaPrivileges.getSecuredFeature(this.privilegeScope, featureId);

    return feature.subFeaturePrivileges.some(
      sfp =>
        formPrivileges.grantsPrivilege(sfp).hasAllRequested &&
        !displayedPrimary?.grantsPrivilege(sfp).hasAllRequested
    );
  }

  public getEffectivePrimaryFeaturePrivilege(featureId: string) {
    const feature = this.kibanaPrivileges.getSecuredFeature(this.privilegeScope, featureId);

    const basePrivilege = this.getBasePrivilege();

    const selectedFeaturePrivileges = this.getSelectedFeaturePrivileges(featureId);

    const allPrimaryFeaturePrivileges = [
      feature.primaryFeaturePrivileges,
      feature.minimalPrimaryFeaturePrivileges,
    ].flat();

    return allPrimaryFeaturePrivileges.find(fp => {
      return (
        selectedFeaturePrivileges.includes(fp.id) ||
        basePrivilege?.grantsPrivilege(fp).hasAllRequested
      );
    });
  }

  public isIndependentSubFeaturePrivilegeGranted(featureId: string, privilegeId: string) {
    const primaryFeaturePrivilege = this.getEffectivePrimaryFeaturePrivilege(featureId);
    if (!primaryFeaturePrivilege) {
      return false;
    }
    const selectedFeaturePrivileges = this.getSelectedFeaturePrivileges(featureId);

    const feature = this.kibanaPrivileges.getSecuredFeature(this.privilegeScope, featureId);

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

  public canCustomizeSubFeaturePrivileges(featureId: string) {
    const selectedFeaturePrivileges = this.getSelectedFeaturePrivileges(featureId);
    const feature = this.kibanaPrivileges.getSecuredFeature(this.privilegeScope, featureId);

    const allPrimaryFeaturePrivs = [
      feature.primaryFeaturePrivileges,
      feature.minimalPrimaryFeaturePrivileges,
    ].flat();

    return allPrimaryFeaturePrivs.some(apfp => selectedFeaturePrivileges.includes(apfp.id));
  }

  public updateSelectedFeaturePrivilegesForCustomization(
    featureId: string,
    willBeCustomizing: boolean
  ) {
    const primary = this.getDisplayedPrimaryFeaturePrivilege(featureId);
    const selectedFeaturePrivileges = this.getSelectedFeaturePrivileges(featureId);

    if (!primary) {
      return selectedFeaturePrivileges;
    }

    const nextPrivileges = selectedFeaturePrivileges.filter(sfp => sfp !== primary.id);

    if (willBeCustomizing) {
      const feature = this.kibanaPrivileges.getSecuredFeature(this.privilegeScope, featureId);

      const startingPrivileges = feature.allPrivileges
        .filter(
          ap => ap instanceof SubFeaturePrivilege && primary.grantsPrivilege(ap).hasAllRequested
        )
        .map(p => p.id);

      nextPrivileges.push(`minimal_${primary.id}`, ...startingPrivileges);
    } else {
      nextPrivileges.push(primary.id);
    }

    return nextPrivileges;
  }

  public hasSupersededPrivileges() {
    const global = this.locateGlobalPrivilege(this.role);

    if (this.privilegeScope === 'global' || !global) {
      return false;
    }

    const globalPrivileges = this.kibanaPrivileges.createCollectionFromRoleKibanaPrivileges([
      global,
    ]);

    const formPrivileges = this.kibanaPrivileges.createCollectionFromRoleKibanaPrivileges([
      this.role.kibana[this.editingIndex],
    ]);

    const basePrivileges = this.kibanaPrivileges.getBasePrivileges(this.privilegeScope);
    const featurePrivileges = this.kibanaPrivileges
      .getSecuredFeatures(this.privilegeScope)
      .map(f => f.allPrivileges);

    return [basePrivileges, featurePrivileges].flat(2).some(p => {
      const globalCheck = globalPrivileges.grantsPrivilege(p);
      const formCheck = formPrivileges.grantsPrivilege(p);
      const isSuperseded = globalCheck.hasAllRequested && !formCheck.hasAllRequested;
      if (isSuperseded) {
        console.log('isSuperseded', {
          privilege: p,
          globalCheck,
          formCheck,
          globalPrivileges,
          formPrivileges,
        });
      }
      return isSuperseded;
    });
  }

  private getSelectedFeaturePrivileges(featureId: string) {
    return this.role.kibana[this.editingIndex].feature[featureId] ?? [];
  }

  private locateGlobalPrivilege(role: Role) {
    return role.kibana.find(entry => isGlobalPrivilegeDefinition(entry));
  }
}
