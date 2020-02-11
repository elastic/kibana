/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FeaturePrivilege } from './feature_privilege';

export class PrimaryFeaturePrivilege extends FeaturePrivilege {
  public isMinimalFeaturePrivilege() {
    return this.id.startsWith('minimal_');
  }

  public getCorrespondingPrivilegeId() {
    if (this.isMinimalFeaturePrivilege()) {
      return this.id.substr(`minimal_`.length);
    }
    return `minimal_${this.id}`;
  }
}
