/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Role } from '../../../../../../../common/model';
import { isGlobalPrivilegeDefinition } from '../../../privilege_utils';
import { KibanaPrivileges, SubFeaturePrivilegeGroup } from '../../../../model';

/**
 * Calculator responsible for determining the displayed and effective privilege values for the following interfaces:
 * - <PrivilegeSpaceForm> and children
 * - <PrivilegeSpaceTable> and children
 */
export class PrivilegeFormCalculator {
  constructor(private readonly kibanaPrivileges: KibanaPrivileges, private readonly role: Role) {}

  /**
   * Returns the assigned base privilege.
   * If more than one base privilege is assigned, the most permissive privilege will be returned.
   * If no base privileges are assigned, then this will return `undefined`.
   *
   * @param privilegeIndex the index of the kibana privileges role component
   */
  public getBasePrivilege(privilegeIndex: number) {
    const entry = this.role.kibana[privilegeIndex];

    const basePrivileges = this.kibanaPrivileges.getBasePrivileges(entry);
    return basePrivileges.find((bp) => entry.base.includes(bp.id));
  }

  /**
   * Returns the ID of the *displayed* Primary Feature Privilege for the indicated feature and privilege index.
   * If the effective primary feature privilege is a "minimal" version, then this returns the corresponding non-minimal version.
   *
   * @example
   * The following kibana privilege entry will return `read`:
   * ```ts
   * const entry = {
   *    base: [],
   *    feature: {
   *       some_feature: ['minimal_read'],
   *    }
   * }
   * ```
   *
   * @param featureId the feature id to get the Primary Feature KibanaPrivilege for.
   * @param privilegeIndex the index of the kibana privileges role component
   */
  public getDisplayedPrimaryFeaturePrivilegeId(featureId: string, privilegeIndex: number) {
    return this.getDisplayedPrimaryFeaturePrivilege(featureId, privilegeIndex)?.id;
  }

  /**
   * Determines if the indicated feature has sub-feature privilege assignments which differ from the "displayed" primary feature privilege.
   *
   * @param featureId the feature id
   * @param privilegeIndex the index of the kibana privileges role component
   */
  public hasCustomizedSubFeaturePrivileges(featureId: string, privilegeIndex: number) {
    const feature = this.kibanaPrivileges.getSecuredFeature(featureId);

    const displayedPrimary = this.getDisplayedPrimaryFeaturePrivilege(featureId, privilegeIndex);

    const formPrivileges = this.kibanaPrivileges.createCollectionFromRoleKibanaPrivileges([
      this.role.kibana[privilegeIndex],
    ]);

    return feature.getSubFeaturePrivileges().some((sfp) => {
      const isGranted = formPrivileges.grantsPrivilege(sfp);
      const isGrantedByDisplayedPrimary = displayedPrimary?.grantsPrivilege(sfp) ?? isGranted;

      return isGranted !== isGrantedByDisplayedPrimary;
    });
  }

  /**
   * Returns the most permissive effective Primary Feature KibanaPrivilege, including the minimal versions.
   *
   * @param featureId the feature id
   * @param privilegeIndex the index of the kibana privileges role component
   */
  public getEffectivePrimaryFeaturePrivilege(featureId: string, privilegeIndex: number) {
    const feature = this.kibanaPrivileges.getSecuredFeature(featureId);

    const basePrivilege = this.getBasePrivilege(privilegeIndex);

    const selectedFeaturePrivileges = this.getSelectedFeaturePrivileges(featureId, privilegeIndex);

    return feature
      .getPrimaryFeaturePrivileges({ includeMinimalFeaturePrivileges: true })
      .find((fp) => {
        return selectedFeaturePrivileges.includes(fp.id) || basePrivilege?.grantsPrivilege(fp);
      });
  }

  /**
   * Determines if the indicated sub-feature privilege is granted.
   *
   * @param featureId the feature id
   * @param privilegeId the sub feature privilege id
   * @param privilegeIndex the index of the kibana privileges role component
   */
  public isIndependentSubFeaturePrivilegeGranted(
    featureId: string,
    privilegeId: string,
    privilegeIndex: number
  ) {
    const kibanaPrivilege = this.role.kibana[privilegeIndex];

    const feature = this.kibanaPrivileges.getSecuredFeature(featureId);
    const subFeaturePrivilege = feature
      .getSubFeaturePrivileges()
      .find((ap) => ap.id === privilegeId)!;

    const assignedPrivileges = this.kibanaPrivileges.createCollectionFromRoleKibanaPrivileges([
      kibanaPrivilege,
    ]);

    return assignedPrivileges.grantsPrivilege(subFeaturePrivilege);
  }

  /**
   * Returns the most permissive effective privilege within the indicated mutually-exclusive sub feature privilege group.
   *
   * @param featureId the feature id
   * @param subFeatureGroup the mutually-exclusive sub feature group
   * @param privilegeIndex the index of the kibana privileges role component
   */
  public getSelectedMutuallyExclusiveSubFeaturePrivilege(
    featureId: string,
    subFeatureGroup: SubFeaturePrivilegeGroup,
    privilegeIndex: number
  ) {
    const kibanaPrivilege = this.role.kibana[privilegeIndex];
    const assignedPrivileges = this.kibanaPrivileges.createCollectionFromRoleKibanaPrivileges([
      kibanaPrivilege,
    ]);

    return subFeatureGroup.privileges.find((p) => {
      return assignedPrivileges.grantsPrivilege(p);
    });
  }

  /**
   * Determines if the indicated feature is capable of having its sub-feature privileges customized.
   *
   * @param featureId the feature id
   * @param privilegeIndex the index of the kibana privileges role component
   */
  public canCustomizeSubFeaturePrivileges(featureId: string, privilegeIndex: number) {
    const selectedFeaturePrivileges = this.getSelectedFeaturePrivileges(featureId, privilegeIndex);
    const feature = this.kibanaPrivileges.getSecuredFeature(featureId);

    return feature
      .getPrimaryFeaturePrivileges({ includeMinimalFeaturePrivileges: true })
      .some((apfp) => selectedFeaturePrivileges.includes(apfp.id));
  }

  /**
   * Returns an updated set of feature privileges based on the toggling of the "Customize sub-feature privileges" control.
   *
   * @param featureId the feature id
   * @param privilegeIndex  the index of the kibana privileges role component
   * @param willBeCustomizing flag indicating if this feature is about to have its sub-feature privileges customized or not
   */
  public updateSelectedFeaturePrivilegesForCustomization(
    featureId: string,
    privilegeIndex: number,
    willBeCustomizing: boolean
  ) {
    const primary = this.getDisplayedPrimaryFeaturePrivilege(featureId, privilegeIndex);
    const selectedFeaturePrivileges = this.getSelectedFeaturePrivileges(featureId, privilegeIndex);

    if (!primary) {
      return selectedFeaturePrivileges;
    }

    const nextPrivileges = [];

    if (willBeCustomizing) {
      const feature = this.kibanaPrivileges.getSecuredFeature(featureId);

      const startingPrivileges = feature
        .getSubFeaturePrivileges()
        .filter((ap) => primary.grantsPrivilege(ap))
        .map((p) => p.id);

      nextPrivileges.push(primary.getMinimalPrivilegeId(), ...startingPrivileges);
    } else {
      nextPrivileges.push(primary.id);
    }

    return nextPrivileges;
  }

  /**
   * Determines if the indicated privilege entry is less permissive than the configured "global" entry for the role.
   * @param privilegeIndex the index of the kibana privileges role component
   */
  public hasSupersededInheritedPrivileges(privilegeIndex: number) {
    const global = this.locateGlobalPrivilege(this.role);

    const entry = this.role.kibana[privilegeIndex];

    if (isGlobalPrivilegeDefinition(entry) || !global) {
      return false;
    }

    const globalPrivileges = this.kibanaPrivileges.createCollectionFromRoleKibanaPrivileges([
      global,
    ]);

    const formPrivileges = this.kibanaPrivileges.createCollectionFromRoleKibanaPrivileges([entry]);

    const hasAssignedBasePrivileges = this.kibanaPrivileges
      .getBasePrivileges(entry)
      .some((base) => entry.base.includes(base.id));

    const featuresWithDirectlyAssignedPrivileges = this.kibanaPrivileges
      .getSecuredFeatures()
      .filter((feature) =>
        feature
          .getAllPrivileges()
          .some((privilege) => entry.feature[feature.id]?.includes(privilege.id))
      );

    const hasSupersededBasePrivileges =
      hasAssignedBasePrivileges &&
      this.kibanaPrivileges
        .getBasePrivileges(entry)
        .some(
          (privilege) =>
            globalPrivileges.grantsPrivilege(privilege) &&
            !formPrivileges.grantsPrivilege(privilege)
        );

    const hasSupersededFeaturePrivileges = featuresWithDirectlyAssignedPrivileges.some((feature) =>
      feature
        .getAllPrivileges()
        .some((fp) => globalPrivileges.grantsPrivilege(fp) && !formPrivileges.grantsPrivilege(fp))
    );

    return hasSupersededBasePrivileges || hasSupersededFeaturePrivileges;
  }

  /**
   * Returns the *displayed* Primary Feature Privilege for the indicated feature and privilege index.
   * If the effective primary feature privilege is a "minimal" version, then this returns the corresponding non-minimal version.
   *
   * @example
   * The following kibana privilege entry will return `read`:
   * ```ts
   * const entry = {
   *    base: [],
   *    feature: {
   *       some_feature: ['minimal_read'],
   *    }
   * }
   * ```
   *
   * @param featureId the feature id to get the Primary Feature KibanaPrivilege for.
   * @param privilegeIndex the index of the kibana privileges role component
   */
  private getDisplayedPrimaryFeaturePrivilege(featureId: string, privilegeIndex: number) {
    const feature = this.kibanaPrivileges.getSecuredFeature(featureId);

    const basePrivilege = this.getBasePrivilege(privilegeIndex);

    const selectedFeaturePrivileges = this.getSelectedFeaturePrivileges(featureId, privilegeIndex);

    return feature.getPrimaryFeaturePrivileges().find((fp) => {
      const correspondingMinimalPrivilegeId = fp.getMinimalPrivilegeId();

      const correspendingMinimalPrivilege = feature
        .getMinimalFeaturePrivileges()
        .find((mp) => mp.id === correspondingMinimalPrivilegeId)!;

      // There are two cases where the minimal privileges aren't available:
      // 1. The feature has no registered sub-features
      // 2. Sub-feature privileges cannot be customized. When this is the case, the minimal privileges aren't registered with ES,
      // so they end up represented in the UI as an empty privilege. Empty privileges cannot be granted other privileges, so if we
      // encounter a minimal privilege that isn't granted by it's correspending primary, then we know we've encountered this scenario.
      const hasMinimalPrivileges =
        feature.subFeatures.length > 0 && fp.grantsPrivilege(correspendingMinimalPrivilege);
      return (
        selectedFeaturePrivileges.includes(fp.id) ||
        (hasMinimalPrivileges &&
          selectedFeaturePrivileges.includes(correspondingMinimalPrivilegeId)) ||
        basePrivilege?.grantsPrivilege(fp)
      );
    });
  }

  private getSelectedFeaturePrivileges(featureId: string, privilegeIndex: number) {
    return this.role.kibana[privilegeIndex].feature[featureId] ?? [];
  }

  private locateGlobalPrivilege(role: Role) {
    return role.kibana.find((entry) => isGlobalPrivilegeDefinition(entry));
  }
}
