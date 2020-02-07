/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ISubFeaturePrivilege } from '../../../../../features/public';
import { FeaturePrivilege } from './feature_privilege';

export class SubFeaturePrivilege extends FeaturePrivilege {
  constructor(
    protected readonly subPrivilegeConfig: ISubFeaturePrivilege,
    public readonly actions: string[] = []
  ) {
    super(subPrivilegeConfig.id, subPrivilegeConfig, actions);
  }

  public get name() {
    return this.subPrivilegeConfig.name;
  }
}
