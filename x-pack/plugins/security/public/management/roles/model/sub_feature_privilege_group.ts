/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SubFeaturePrivilegeGroupConfig } from '@kbn/features-plugin/common';

import { SubFeaturePrivilege } from './sub_feature_privilege';

export class SubFeaturePrivilegeGroup {
  constructor(
    private readonly config: SubFeaturePrivilegeGroupConfig,
    private readonly actionMapping: { [privilegeId: string]: string[] } = {}
  ) {}

  public get groupType() {
    return this.config.groupType;
  }

  public get privileges() {
    return this.config.privileges.map(
      (p) => new SubFeaturePrivilege(p, this.actionMapping[p.id] || [])
    );
  }
}
