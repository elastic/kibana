/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SubFeatureConfig } from '../../../features/common';
import { SubFeaturePrivilege } from './sub_feature_privilege';
import { SubFeaturePrivilegeGroup } from '.';

export class SubFeature {
  constructor(
    private readonly config: SubFeatureConfig,
    private readonly actionMapping: { [privilegeId: string]: string[] }
  ) {}

  public get id() {
    return this.config.id;
  }

  public get name() {
    return this.config.name;
  }

  public get privilegeGroups() {
    return this.config.privilegeGroups.map(pg => new SubFeaturePrivilegeGroup(pg));
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
        .map(p => new SubFeaturePrivilege(p, this.actionMapping[p.id]))
        .filter(subFeaturePrivilege => predicate(subFeaturePrivilege, this));
    }
  }
}
