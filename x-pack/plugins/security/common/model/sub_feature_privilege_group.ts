/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SubFeaturePrivilegeGroupConfig } from '../../../features/common';
import { SubFeaturePrivilege } from './sub_feature_privilege';
import { PrivilegeScope } from './poc_kibana_privileges/privilege_instance';

export class SubFeaturePrivilegeGroup {
  constructor(
    private readonly scope: PrivilegeScope,
    private readonly config: SubFeaturePrivilegeGroupConfig,
    private readonly actionMapping: { [privilegeId: string]: string[] } = {}
  ) {}

  public get groupType() {
    return this.config.groupType;
  }

  public get privileges() {
    return this.config.privileges.map(
      p => new SubFeaturePrivilege(this.scope, p, this.actionMapping[p.id] || [])
    );
  }
}
