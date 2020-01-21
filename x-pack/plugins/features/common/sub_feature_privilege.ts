/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FeaturePrivilege } from './feature_privilege';
import { FeatureKibanaPrivileges } from './feature_kibana_privileges';
import { PrimaryFeaturePrivilege } from './primary_feature_privilege';

export interface SubFeaturePrivilegeConfig extends FeatureKibanaPrivileges {
  id: string;
  includeIn: 'all' | 'read' | 'none';
}

export class SubFeaturePrivilege extends FeaturePrivilege {
  constructor(private readonly subPrivilegeConfig: SubFeaturePrivilegeConfig) {
    super(subPrivilegeConfig.id, subPrivilegeConfig);
  }

  public static empty() {
    return new SubFeaturePrivilege({
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
    });
  }

  public includeIn(primaryFeaturePrivilege: PrimaryFeaturePrivilege) {
    return (
      this.subPrivilegeConfig.includeIn === primaryFeaturePrivilege.id ||
      this.subPrivilegeConfig.includeIn === 'read'
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

    return new SubFeaturePrivilege(mergedPrivilege);
  }
}
