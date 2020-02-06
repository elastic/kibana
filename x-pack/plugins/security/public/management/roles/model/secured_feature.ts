/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Feature, IFeature } from '../../../../../features/common';
import { PrimaryFeaturePrivilege } from './primary_feature_privilege';
import { SecuredSubFeature } from './secured_sub_feature';
import { SubFeaturePrivilege } from './sub_feature_privilege';
import { FeaturePrivilege } from '.';

export class SecuredFeature extends Feature {
  public readonly primaryFeaturePrivileges: PrimaryFeaturePrivilege[];
  public readonly minimalPrimaryFeaturePrivileges: PrimaryFeaturePrivilege[];

  public readonly subFeaturePrivileges: SubFeaturePrivilege[];

  public readonly subFeatures: SecuredSubFeature[];

  constructor(config: IFeature, actionMapping: { [privilegeId: string]: string[] } = {}) {
    super(config);
    this.primaryFeaturePrivileges = Object.entries(this.config.privileges || {}).map(
      ([id, privilege]) => new PrimaryFeaturePrivilege(id, privilege, actionMapping[id])
    );

    this.minimalPrimaryFeaturePrivileges = Object.entries(this.config.privileges || {}).map(
      ([id, privilege]) =>
        new PrimaryFeaturePrivilege(`minimal_${id}`, privilege, actionMapping[`minimal_${id}`])
    );

    this.subFeatures =
      this.config.subFeatures?.map(sf => new SecuredSubFeature(sf, actionMapping)) ?? [];

    this.subFeaturePrivileges = [];
    for (const subFeature of this.subFeatures) {
      for (const subFeaturePriv of subFeature.privilegeIterator()) {
        this.subFeaturePrivileges.push(subFeaturePriv);
      }
    }
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
          privilege: new FeaturePrivilege('_reserved_', this.config.reserved.privilege, []),
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
}
