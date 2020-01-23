/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FeatureKibanaPrivileges } from './feature_kibana_privileges';

export interface SubFeatureConfig {
  name: string;
  privilegeGroups: SubFeaturePrivilegeGroupConfig[];
}
export interface SubFeaturePrivilegeGroupConfig {
  groupType: 'mutually_exclusive' | 'independent';
  privileges: SubFeaturePrivilegeConfig[];
}

export interface SubFeaturePrivilegeConfig extends FeatureKibanaPrivileges {
  id: string;
  includeIn: 'all' | 'read' | 'none';
}

export class SubFeature {
  constructor(protected readonly config: SubFeatureConfig) {}

  public get name() {
    return this.config.name;
  }

  public get privilegeGroups() {
    return this.config.privilegeGroups;
  }
}
