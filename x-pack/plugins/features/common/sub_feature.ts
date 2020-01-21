/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SubFeaturePrivilege, SubFeaturePrivilegeConfig } from './sub_feature_privilege';

export interface SubFeaturePrivilegeGroup {
  name: string;
  groupType: 'mutually_exclusive' | 'independent';
  privileges: SubFeaturePrivilegeConfig[];
}

export interface SubFeatureConfig {
  id: string;
  name: string;
  privilegeGroups: SubFeaturePrivilegeGroup[];
}

export class SubFeature {
  constructor(private readonly config: SubFeatureConfig) {}

  public get id() {
    return this.config.id;
  }

  public *privilegeIterator({
    predicate = () => true,
  }: {
    predicate?: (privilege: SubFeaturePrivilege, subFeature: SubFeature) => boolean;
  } = {}): IterableIterator<SubFeaturePrivilege> {
    if (!this.config.privilegeGroups) {
      return [];
    }

    for (const group of this.config.privilegeGroups) {
      yield* group.privileges
        .map(p => new SubFeaturePrivilege(p))
        .filter(subFeaturePrivilege => predicate(subFeaturePrivilege, this));
    }
  }
}
