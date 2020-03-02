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
    return basePrivileges.find(bp => entry.base.includes(bp.id));
  }

  /**
   * Returns the *displayed* Primary Feature KibanaPrivilege for the indicated feature and privilege index.
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
  public getDisplayedPrimaryFeaturePrivilege(featureId: string, privilegeIndex: number) {
    const feature = this.kibanaPrivileges.getSecuredFeature(featureId);

    const basePrivilege = this.getBasePrivilege(privilegeIndex);

    const selectedFeaturePrivileges = this.getSelectedFeaturePrivileges(featureId, privilegeIndex);

    return feature.getPrimaryFeaturePrivileges().find(fp => {
      const correspondingPrivilegeId = fp.getCorrespondingPrivilegeId();
      const hasMinimalPrivileges = feature.subFeatures.length > 0;
      return (
        selectedFeaturePrivileges.includes(fp.id) ||
        (hasMinimalPrivileges && selectedFeaturePrivileges.includes(correspondingPrivilegeId)) ||
        basePrivilege?.grantsPrivilege(fp)
      );
    });
  }

  /**
   * Determines if the indicated feature has sub-feature privileges assigned which are not superseded
   * by any other assigned privileges.
   *
   * @param featureId the feature id
   * @param privilegeIndex the index of the kibana privileges role component
   */
  public hasNonSupersededSubFeaturePrivileges(featureId: string, privilegeIndex: number) {
    // We don't want the true effective primary here.
    // We want essentially the non-minimal version of whatever the primary happens to be.
    const displayedPrimary = this.getDisplayedPrimaryFeaturePrivilege(featureId, privilegeIndex);

    const formPrivileges = this.kibanaPrivileges.createCollectionFromRoleKibanaPrivileges([
      this.role.kibana[privilegeIndex],
    ]);

    const feature = this.kibanaPrivileges.getSecuredFeature(featureId);

    return feature
      .getSubFeaturePrivileges()
      .some(sfp => formPrivileges.grantsPrivilege(sfp) && !displayedPrimary?.grantsPrivilege(sfp));
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
      .find(fp => {
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
    const primaryFeaturePrivilege = this.getEffectivePrimaryFeaturePrivilege(
      featureId,
      privilegeIndex
    );
    if (!primaryFeaturePrivilege) {
      return false;
    }
    const selectedFeaturePrivileges = this.getSelectedFeaturePrivileges(featureId, privilegeIndex);

    const feature = this.kibanaPrivileges.getSecuredFeature(featureId);

    const subFeaturePrivilege = feature
      .getSubFeaturePrivileges()
      .find(ap => ap.id === privilegeId)!;

    return Boolean(
      primaryFeaturePrivilege.grantsPrivilege(subFeaturePrivilege) ||
        selectedFeaturePrivileges.includes(subFeaturePrivilege.id)
    );
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
    const primaryFeaturePrivilege = this.getEffectivePrimaryFeaturePrivilege(
      featureId,
      privilegeIndex
    );
    if (!primaryFeaturePrivilege) {
      return undefined;
    }

    const selectedFeaturePrivileges = this.getSelectedFeaturePrivileges(featureId, privilegeIndex);

    return subFeatureGroup.privileges.find(p => {
      return primaryFeaturePrivilege.grantsPrivilege(p) || selectedFeaturePrivileges.includes(p.id);
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
      .some(apfp => selectedFeaturePrivileges.includes(apfp.id));
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
        .filter(ap => primary.grantsPrivilege(ap))
        .map(p => p.id);

      const existingPrivileges = selectedFeaturePrivileges.filter(
        sfp => sfp !== primary.id && sfp !== primary.getCorrespondingPrivilegeId()
      );

      nextPrivileges.push(
        ...existingPrivileges,
        primary.getCorrespondingPrivilegeId(),
        ...startingPrivileges
      );
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

    const formPrivileges = this.kibanaPrivileges.createCollectionFromRoleKibanaPrivileges([
      this.role.kibana[privilegeIndex],
    ]);

    const hasAssignedBasePrivileges = this.kibanaPrivileges
      .getBasePrivileges(entry)
      .some(base => entry.base.includes(base.id));

    const featuresWithDirectlyAssignedPrivileges = this.kibanaPrivileges
      .getSecuredFeatures()
      .filter(feature =>
        feature
          .getAllPrivileges()
          .some(privilege => entry.feature[feature.id]?.includes(privilege.id))
      );

    const hasSupersededBasePrivileges =
      hasAssignedBasePrivileges &&
      this.kibanaPrivileges
        .getBasePrivileges(entry)
        .some(
          privilege =>
            globalPrivileges.grantsPrivilege(privilege) &&
            !formPrivileges.grantsPrivilege(privilege)
        );

    const hasSupersededFeaturePrivileges = featuresWithDirectlyAssignedPrivileges.some(feature =>
      feature
        .getAllPrivileges()
        .some(fp => globalPrivileges.grantsPrivilege(fp) && !formPrivileges.grantsPrivilege(fp))
    );

    return hasSupersededBasePrivileges || hasSupersededFeaturePrivileges;
  }

  public getSecuredFeatures() {
    return this.kibanaPrivileges.getSecuredFeatures();
  }

  private getSelectedFeaturePrivileges(featureId: string, privilegeIndex: number) {
    return this.role.kibana[privilegeIndex].feature[featureId] ?? [];
  }

  private locateGlobalPrivilege(role: Role) {
    return role.kibana.find(entry => isGlobalPrivilegeDefinition(entry));
  }
}
