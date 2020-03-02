/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KibanaPrivilege } from './kibana_privilege';
import { FeatureKibanaPrivileges } from '../../../../../features/public';

export class PrimaryFeaturePrivilege extends KibanaPrivilege {
  constructor(
    id: string,
    protected readonly config: FeatureKibanaPrivileges,
    public readonly actions: string[] = []
  ) {
    super(id, actions);
  }

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
