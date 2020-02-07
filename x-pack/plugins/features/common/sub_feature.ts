/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FeatureKibanaPrivileges } from './feature_kibana_privileges';

export interface ISubFeature {
  name: string;
  privilegeGroups: ISubFeaturePrivilegeGroup[];
}
export interface ISubFeaturePrivilegeGroup {
  groupType: 'mutually_exclusive' | 'independent';
  privileges: ISubFeaturePrivilege[];
}

export interface ISubFeaturePrivilege extends FeatureKibanaPrivileges {
  id: string;
  name: string;
  includeIn: 'all' | 'read' | 'none';
}

export class SubFeature {
  constructor(protected readonly config: ISubFeature) {}

  public get name() {
    return this.config.name;
  }

  public get privilegeGroups() {
    return this.config.privilegeGroups;
  }
}
