/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SubFeaturePrivilegeConfig } from '@kbn/features-plugin/public';

import { KibanaPrivilege } from './kibana_privilege';

export class SubFeaturePrivilege extends KibanaPrivilege {
  constructor(
    protected readonly subPrivilegeConfig: SubFeaturePrivilegeConfig,
    public readonly actions: string[] = []
  ) {
    super(subPrivilegeConfig.id, actions);
  }

  public get name() {
    return this.subPrivilegeConfig.name;
  }
}
