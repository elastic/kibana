/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SubFeature, SubFeatureConfig } from '../../../../../features/common';
import { SubFeaturePrivilege } from './sub_feature_privilege';
import { SubFeaturePrivilegeGroup } from './sub_feature_privilege_group';

export class SecuredSubFeature extends SubFeature {
  public readonly privileges: SubFeaturePrivilege[];

  constructor(
    config: SubFeatureConfig,
    private readonly actionMapping: { [privilegeId: string]: string[] } = {}
  ) {
    super(config);

    this.privileges = [];
    for (const privilege of this.privilegeIterator()) {
      this.privileges.push(privilege);
    }
  }

  public getPrivilegeGroups() {
    return this.privilegeGroups.map((pg) => new SubFeaturePrivilegeGroup(pg, this.actionMapping));
  }

  public *privilegeIterator({
    predicate = () => true,
  }: {
    predicate?: (privilege: SubFeaturePrivilege, feature: SecuredSubFeature) => boolean;
  } = {}): IterableIterator<SubFeaturePrivilege> {
    for (const group of this.privilegeGroups) {
      yield* group.privileges
        .map((gp) => new SubFeaturePrivilege(gp, this.actionMapping[gp.id]))
        .filter((privilege) => predicate(privilege, this));
    }
  }
}
