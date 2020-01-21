/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import _ from 'lodash';
import { FeaturePrivilege } from './feature_privilege';

export class PrimaryFeaturePrivilege extends FeaturePrivilege {
  public get isMinimalFeaturePrivilege() {
    return this.id.startsWith('minimal_');
  }

  public merge(otherPrivilege: FeaturePrivilege) {
    return new PrimaryFeaturePrivilege(this.id, this.mergePrivilegeConfigs(otherPrivilege));
  }
}
