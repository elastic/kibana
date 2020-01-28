/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import _ from 'lodash';
import { PrivilegeCollection } from '../../../../../../../common/model/poc_kibana_privileges/privilege_collection';
import { PrivilegeScope } from '../../../../../../../common/model/poc_kibana_privileges/privilege_instance';
import {
  KibanaPrivileges,
  Role,
  Privilege,
  PrimaryFeaturePrivilege,
  SubFeaturePrivilege,
  SubFeaturePrivilegeGroup,
  RoleKibanaPrivilege,
  SecuredFeature,
} from '../../../../../../../common/model';
import { NO_PRIVILEGE_VALUE } from '../constants';

export type ScopedPrivilegeCalculator = ReturnType<PrivilegeCalculator['getScopedInstance']>;

export class PrivilegeCalculator {
  constructor(private readonly kibanaPrivileges: KibanaPrivileges) {}

  public getScopedInstance(role: Role, privilegeIndex: number) {
    const scope = this._getScope(role, privilegeIndex);

    const { direct, inherited } = this._getRelevantEntries(role, privilegeIndex);

    const inheritedPrivileges = this.kibanaPrivileges.createCollectionFromRoleKibanaPrivileges(
      inherited
    );

    const assignedPrivileges = this.kibanaPrivileges.createCollectionFromRoleKibanaPrivileges([
      ...direct,
      ...inherited,
    ]);

    const features = Array.from(this.kibanaPrivileges.getAllFeaturePrivileges(scope).values());

    return {
      getSecuredFeatures: () => this.kibanaPrivileges.getSecuredFeatures(scope),

      getFeaturePrivileges: (featureId: string) =>
        this.kibanaPrivileges.getFeaturePrivileges(scope, featureId),

      hasNonSupersededFeaturePrivileges: () =>
        this.hasNonSupersededFeaturePrivileges(assignedPrivileges, features),

      describeBasePrivileges: () => {
        return this.describeBasePrivileges(
          assignedPrivileges,
          this.kibanaPrivileges.getBasePrivileges(scope)
        );
      },

      describePrimaryFeaturePrivileges: (featureId: string) =>
        this.describePrimaryFeaturePrivileges(
          assignedPrivileges,
          features.find(f => f.id === featureId)!
        ),

      canCustomizeSubFeaturePrivileges: (featureId: string) =>
        this.canCustomizeSubFeaturePrivileges(
          assignedPrivileges,
          inheritedPrivileges,
          features.find(f => f.id === featureId)!
        ),

      isCustomizingSubFeaturePrivileges: (featureId: string) =>
        this.isCustomizingSubFeaturePrivileges(
          assignedPrivileges,
          features.find(f => f.id === featureId)!
        ),

      toggleMinimalPrimaryFeaturePrivilege: (featureId: string) =>
        this.toggleMinimalPrimaryFeaturePrivilege(
          assignedPrivileges,
          features.find(f => f.id === featureId)!
        ),

      describeFeaturePrivilege: (featureId: string, privilegeId: string) => {
        const featurePrivileges = this.kibanaPrivileges.getFeaturePrivileges(scope, featureId);
        const privilege = featurePrivileges.find(fp => fp.id === privilegeId)!;
        return {
          selected: assignedPrivileges.grantsPrivilege(privilege).hasAllRequested,
          inherited: inheritedPrivileges.grantsPrivilege(privilege).hasAllRequested,
        };
      },

      describeMutuallyExclusiveSubFeaturePrivileges: (privilegeGroup: SubFeaturePrivilegeGroup) =>
        this.describeMutuallyExclusiveSubFeaturePrivileges(assignedPrivileges, privilegeGroup),
    };
  }

  public _locateGlobalPrivilege(role: Role) {
    return role.kibana.find(entry => this.isGlobalPrivilege(entry));
  }

  public _getScope(role: Role, privilegeIndex: number): PrivilegeScope {
    if (this.isGlobalPrivilege(role.kibana[privilegeIndex])) {
      return 'global';
    }
    return 'space';
  }

  public _collectRelevantEntries(role: Role, privilegeIndex: number) {
    const entries = [];

    const entry = role.kibana[privilegeIndex];
    if (entry) {
      entries.push(entry);
    }

    const globalEntry = this._locateGlobalPrivilege(role);
    if (globalEntry && globalEntry !== entry) {
      entries.push(globalEntry);
    }

    return entries;
  }

  public _getRelevantEntries(role: Role, privilegeIndex: number) {
    const result = {
      inherited: [] as RoleKibanaPrivilege[],
      direct: [] as RoleKibanaPrivilege[],
    };

    const directEntry = role.kibana[privilegeIndex];
    if (directEntry) {
      result.direct.push(directEntry);
    }

    const globalEntry = this._locateGlobalPrivilege(role);
    if (globalEntry && globalEntry !== directEntry) {
      result.inherited.push(globalEntry);
    }

    return result;
  }

  public getFeaturePrivileges(role: Role, privilegeIndex: number, featureId: string) {
    return this.kibanaPrivileges.getFeaturePrivileges(
      this._getScope(role, privilegeIndex),
      featureId
    );
  }

  // privilege space table
  private hasNonSupersededFeaturePrivileges(
    assignedPrivileges: PrivilegeCollection,
    features: SecuredFeature[]
  ) {
    const [basePrivilegeCollection, featurePrivilegeCollection] = assignedPrivileges.bisect(p =>
      p.type === 'base' ? 'first' : 'second'
    );

    return features.some(fp =>
      fp.allPrivileges.some(
        fpp =>
          featurePrivilegeCollection.grantsPrivilege(fpp).hasAllRequested &&
          !basePrivilegeCollection.grantsPrivilege(fpp).hasAllRequested
      )
    );
  }

  // base privilege drop-down
  private describeBasePrivileges(
    assignedPrivileges: PrivilegeCollection,
    basePrivileges: Privilege[]
  ): {
    [privilegeId: string]: {
      id: string;
      inherited: boolean;
      directlyAssigned: boolean;
      enabled: boolean;
      selected: boolean;
    };
  } {
    return basePrivileges.reduce((acc, privilege) => {
      const grantingPrivileges = assignedPrivileges.getPrivilegesGranting(privilege);

      const isInherited = grantingPrivileges.some(gp => gp.scope !== privilege.scope);
      const isSelected = grantingPrivileges.some(gp => gp.id === privilege.id);
      const isDirectlyAssigned = grantingPrivileges.some(gp => gp.equals(privilege));
      const isEnabled = !isInherited || isSelected;

      return {
        ...acc,
        [privilege.id]: {
          id: privilege.id,
          inherited: isInherited,
          directlyAssigned: isDirectlyAssigned,
          enabled: isEnabled,
          selected: isSelected,
        },
      };
    }, {});
  }

  // Primary Feature Privilege Button Group
  public describePrimaryFeaturePrivileges(
    assignedPrivileges: PrivilegeCollection,
    feature: SecuredFeature
  ) {
    const result = {
      selectedPrivilegeId: undefined as string | undefined,
      enabledPrivilegeIds: [] as string[],
      areAnyInherited: false,
    };

    feature.primaryFeaturePrivileges.forEach(privilege => {
      const primaryDescription = this.describePrivilegeAssignment(assignedPrivileges, privilege);

      const correspondingMinimal = feature.minimalPrimaryFeaturePrivileges.find(
        mpfp => mpfp.id === `minimal_${privilege.id}`
      )!;

      const minimalPrimaryDescription = this.describePrivilegeAssignment(
        assignedPrivileges,
        correspondingMinimal
      );

      if (!result.selectedPrivilegeId) {
        if (primaryDescription.isSelected || minimalPrimaryDescription.isSelected) {
          result.selectedPrivilegeId = privilege.id;
        }
      }

      if (primaryDescription.isEnabled || minimalPrimaryDescription.isEnabled) {
        result.enabledPrivilegeIds.push(privilege.id);
      }

      result.areAnyInherited =
        result.areAnyInherited ||
        primaryDescription.isInherited ||
        minimalPrimaryDescription.isInherited;
    });

    return result;
  }

  // Customize Sub-Feature Privileges Checkbox
  public canCustomizeSubFeaturePrivileges(
    assignedPrivileges: PrivilegeCollection,
    inheritedPrivileges: PrivilegeCollection,
    feature: SecuredFeature
  ) {
    const assignedPrimaryFeaturePrivilege = [
      feature.primaryFeaturePrivileges,
      feature.minimalPrimaryFeaturePrivileges,
    ]
      .flat()
      .find(p => assignedPrivileges.grantsPrivilege(p).hasAllRequested);

    if (!assignedPrimaryFeaturePrivilege) {
      return false;
    }

    const hasUninheritedSubFeaturePrivilege = feature.allPrivileges.some(
      p => !inheritedPrivileges.grantsPrivilege(p).hasAllRequested
    );

    if (!hasUninheritedSubFeaturePrivilege) {
      return false;
    }

    const [
      assignedPrimaryFeaturePrivileges,
      otherPrivileges,
    ] = assignedPrivileges.bisect(privilege =>
      privilege.type === 'feature' && privilege instanceof PrimaryFeaturePrivilege
        ? 'first'
        : 'second'
    );

    const mostPermissiveAssignedGrantIndex = feature.allPrivileges.findIndex(
      fp => assignedPrimaryFeaturePrivileges.grantsPrivilege(fp).hasAllRequested
    );

    const mostPermissiveInheritedGrantIndex = feature.allPrivileges.findIndex(
      fp => otherPrivileges.grantsPrivilege(fp).hasAllRequested
    );

    const hasNonSupersededPrimaryFeaturePrivilege =
      mostPermissiveAssignedGrantIndex >= 0 &&
      (mostPermissiveInheritedGrantIndex < 0 ||
        mostPermissiveInheritedGrantIndex > mostPermissiveAssignedGrantIndex);

    return hasNonSupersededPrimaryFeaturePrivilege;
  }

  public isCustomizingSubFeaturePrivileges(
    assignedPrivileges: PrivilegeCollection,
    feature: SecuredFeature
  ) {
    const [
      subFeaturePrivilegesCollection,
      otherPrivilegesCollection,
    ] = assignedPrivileges.bisect(p => (p instanceof SubFeaturePrivilege ? 'first' : 'second'));

    const subFeaturePrivileges = feature.allPrivileges.filter(
      p => p instanceof SubFeaturePrivilege
    );

    const hasNonSupersededSubFeaturePrivileges = subFeaturePrivileges.some(
      sfp =>
        subFeaturePrivilegesCollection.grantsPrivilege(sfp).hasAllRequested &&
        !otherPrivilegesCollection.grantsPrivilege(sfp).hasAllRequested
    );

    const mostPermissiveMinimumPrimary = feature.minimalPrimaryFeaturePrivileges.find(
      fp => assignedPrivileges.grantsPrivilege(fp).hasAllRequested
    );

    const correspondingPrimary = feature.primaryFeaturePrivileges.find(
      pfp => `minimal_${pfp.id}` === mostPermissiveMinimumPrimary?.id
    );

    const hasEffectiveMininiumPrimaryFeaturePrivilege =
      Boolean(mostPermissiveMinimumPrimary) &&
      !assignedPrivileges.grantsPrivilege(correspondingPrimary!).hasAllRequested;

    return hasEffectiveMininiumPrimaryFeaturePrivilege || hasNonSupersededSubFeaturePrivileges;
  }

  // Customize Sub-Feature Privileges Checkbox
  public toggleMinimalPrimaryFeaturePrivilege(
    assignedPrivileges: PrivilegeCollection,
    feature: SecuredFeature
  ) {
    const grantedNonMinimalPrivilege = feature.primaryFeaturePrivileges.find(
      fp => assignedPrivileges.grantsPrivilege(fp).hasAllRequested
    );

    const grantedMinimalPrivilege = feature.minimalPrimaryFeaturePrivileges.find(
      fp => assignedPrivileges.grantsPrivilege(fp).hasAllRequested
    );

    if (grantedNonMinimalPrivilege) {
      return feature.minimalPrimaryFeaturePrivileges.find(
        fp => fp.id === `minimal_${grantedNonMinimalPrivilege.id}`
      )!;
    }
    if (grantedMinimalPrivilege) {
      return feature.primaryFeaturePrivileges.find(
        fp => `minimal_${fp.id}` === grantedMinimalPrivilege.id
      )!;
    }
    throw new Error(
      `Expected either a minimal or non-minimal primary feature privilege to be assigned for feature ${feature.id}`
    );
  }

  // Mutually-Exclusive Sub-Feature Button Group
  public describeMutuallyExclusiveSubFeaturePrivileges(
    assignedPrivileges: PrivilegeCollection,
    subFeatureGroup: SubFeaturePrivilegeGroup
  ) {
    return subFeatureGroup.privileges.reduce((acc, privilege, index) => {
      const grantingPrivileges = assignedPrivileges.getPrivilegesGranting(privilege);

      const isInherited = grantingPrivileges.some(gp => gp.scope !== privilege.scope);
      const isSelected = grantingPrivileges.some(gp => gp.id === privilege.id);
      const isDirectlyAssigned = grantingPrivileges.some(gp => gp.equals(privilege));
      const isEnabled = !isInherited || isSelected;

      return {
        ...acc,
        [privilege.id]: {
          inherited: isInherited,
          enabled: isEnabled,
          selected: isSelected,
        },
      };
    }, {} as Record<string, { inherited: boolean; enabled: boolean; selected: boolean }>);
  }

  public getEffectiveBasePrivilege(role: Role, privilegeIndex: number) {
    const privilegeSet = role.kibana[privilegeIndex];

    const entries = this._collectRelevantEntries(role, privilegeIndex);
    const collection = this.kibanaPrivileges.createCollectionFromRoleKibanaPrivileges(entries);

    const basePrivileges = this.isGlobalPrivilege(privilegeSet)
      ? this.kibanaPrivileges.getGlobalPrivileges()
      : this.kibanaPrivileges.getSpacesPrivileges();

    const effectiveBasePrivilege: Privilege | undefined = basePrivileges.find(
      base => collection.grantsPrivilege(base).hasAllRequested
    );

    return effectiveBasePrivilege;
  }

  private describePrivilegeAssignment(
    assignedPrivileges: PrivilegeCollection,
    candidatePrivilege: Privilege
  ) {
    const grantingPrivileges = assignedPrivileges.getPrivilegesGranting(candidatePrivilege);

    const isInherited = grantingPrivileges.some(gp => gp.scope !== candidatePrivilege.scope);
    const isSelected = grantingPrivileges.some(gp => gp.id === candidatePrivilege.id);
    const isDirectlyAssigned = grantingPrivileges.some(gp => gp.equals(candidatePrivilege));
    const isEnabled = !isInherited || isSelected;

    return {
      id: candidatePrivilege.id,
      isInherited,
      isSelected,
      isDirectlyAssigned,
      isEnabled,
    };
  }

  private isGlobalPrivilege({ spaces = [] }: { spaces?: string[] } = {}) {
    return spaces.includes('*');
  }
}
