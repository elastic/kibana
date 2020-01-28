/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FeatureKibanaPrivileges } from '../../../features/common';
import { FeaturePrivilege } from './feature_privilege';
import { PrimaryFeaturePrivilege } from './primary_feature_privilege';
import { PrivilegeScope } from './poc_kibana_privileges/privilege_instance';

export interface SubFeaturePrivilegeConfig extends FeatureKibanaPrivileges {
  id: string;
  includeIn: 'all' | 'read' | 'none';
}

export class SubFeaturePrivilege extends FeaturePrivilege {
  constructor(
    scope: PrivilegeScope,
    protected readonly subPrivilegeConfig: SubFeaturePrivilegeConfig,
    public readonly actions: string[] = []
  ) {
    super(scope, subPrivilegeConfig.id, subPrivilegeConfig, actions);
  }

  public static empty(scope: PrivilegeScope) {
    return new SubFeaturePrivilege(
      scope,
      {
        id: '____EMPTY____',
        name: '____EMPTY SUB FEATURE PRIVILEGE____',
        includeIn: 'none',
        api: [],
        app: [],
        ui: [],
        savedObject: {
          all: [],
          read: [],
        },
      } as SubFeaturePrivilegeConfig,
      []
    );
  }

  public merge(otherSubFeature: SubFeaturePrivilege): SubFeaturePrivilege {
    const mergedPrivilege: SubFeaturePrivilegeConfig = {
      ...this.subPrivilegeConfig,
      api: this.api ? [...(this.api || []), ...(otherSubFeature.api || [])] : undefined,
      app: this.app ? [...(this.app || []), ...(otherSubFeature.app || [])] : undefined,
      ui: this.ui ? [...this.ui, ...otherSubFeature.ui!] : [],
      savedObject: {
        all: [...this.savedObject.all, ...otherSubFeature.savedObject.all],
        read: [...this.savedObject.read, ...otherSubFeature.savedObject.read],
      },
    };

    return new SubFeaturePrivilege(
      this.scope,
      mergedPrivilege,
      Array.from(new Set([...this.actions, ...otherSubFeature.actions]).values())
    );
  }
}
