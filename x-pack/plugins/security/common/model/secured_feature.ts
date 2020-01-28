/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Feature, IFeature } from '../../../features/common';
import { FeaturePrivilege } from './feature_privilege';
import { PrimaryFeaturePrivilege } from './primary_feature_privilege';
import { SecuredSubFeature } from './secured_sub_feature';
import { PrivilegeScope } from './poc_kibana_privileges/privilege_instance';

export class SecuredFeature extends Feature {
  public readonly primaryFeaturePrivileges: PrimaryFeaturePrivilege[];
  public readonly minimalPrimaryFeaturePrivileges: PrimaryFeaturePrivilege[];

  public readonly subFeatures: SecuredSubFeature[];

  constructor(
    config: IFeature,
    actionMapping: { [privilegeId: string]: string[] } = {},
    public readonly scope: PrivilegeScope
  ) {
    super(config);
    this.primaryFeaturePrivileges = Object.entries(this.config.privileges || {}).map(
      ([id, privilege]) => new PrimaryFeaturePrivilege(scope, id, privilege, actionMapping[id])
    );

    this.minimalPrimaryFeaturePrivileges = Object.entries(this.config.privileges || {}).map(
      ([id, privilege]) =>
        new PrimaryFeaturePrivilege(
          scope,
          `minimal_${id}`,
          privilege,
          actionMapping[`minimal_${id}`]
        )
    );

    this.subFeatures =
      this.config.subFeatures?.map(sf => new SecuredSubFeature(scope, sf, actionMapping)) ?? [];

    this.scope = scope;
  }

  public get excludeFromBasePrivileges() {
    return Boolean(this.config.excludeFromBasePrivileges);
  }

  public get privilegesTooltip() {
    return this.config.privilegesTooltip;
  }

  public get reserved() {
    return this.config.reserved
      ? {
          // TODO priv id
          privilege: new FeaturePrivilege(
            this.scope,
            '_reserved_',
            this.config.reserved.privilege,
            []
          ),
          description: this.config.reserved.description,
        }
      : undefined;
  }

  public get allPrivileges() {
    const subFeaturePrivileges = [];
    for (const subFeature of this.subFeatures) {
      for (const subFeaturePriv of subFeature.privilegeIterator()) {
        subFeaturePrivileges.push(subFeaturePriv);
      }
    }

    return [
      ...this.primaryFeaturePrivileges,
      ...this.minimalPrimaryFeaturePrivileges,
      ...subFeaturePrivileges,
    ];
  }

  // public *privilegeIterator({
  //   augmentWithSubFeaturePrivileges = true,
  //   predicate = () => true,
  // }: {
  //   augmentWithSubFeaturePrivileges?: boolean;
  //   predicate?: (privilege: PrimaryFeaturePrivilege, feature: SecuredFeature) => boolean;
  // }): IterableIterator<PrimaryFeaturePrivilege> {
  //   if (!this.config.privileges) {
  //     return [];
  //   }

  //   const allSubFeaturePrivileges: SubFeaturePrivilege[] = [];

  //   if (augmentWithSubFeaturePrivileges) {
  //     for (const subFeature of this.subFeatures) {
  //       for (const subFeaturePriv of subFeature.privilegeIterator()) {
  //         allSubFeaturePrivileges.push(subFeaturePriv);
  //       }
  //     }
  //   }

  //   yield* this.primaryFeaturePrivileges
  //     .filter(privilege => (predicate ? predicate(privilege, this) : true))
  //     .map(privilege => {
  //       const subFeaturePrivsToMerge = allSubFeaturePrivileges.filter(priv =>
  //         priv.includeIn(privilege)
  //       );

  //       const subFeaturePrivileges: SubFeaturePrivilege = subFeaturePrivsToMerge.reduce(
  //         (acc, addon) => {
  //           return acc.merge(addon);
  //         },
  //         SubFeaturePrivilege.empty(this.scope)
  //       );

  //       const mergedPrivilege = privilege.merge(subFeaturePrivileges);

  //       return mergedPrivilege;
  //     });
  // }

  // public *subFeaturePrivilegeIterator(): IterableIterator<SubFeaturePrivilege> {
  //   for (const subFeature of this.subFeatures) {
  //     yield* subFeature.privilegeIterator();
  //   }
  // }
}
