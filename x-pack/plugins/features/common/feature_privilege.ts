/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { uniq, merge } from 'lodash';
import { FeatureKibanaPrivileges } from './feature_kibana_privileges';

export class FeaturePrivilege {
  constructor(private readonly config: FeatureKibanaPrivileges) {}

  public get excludeFromBasePrivileges() {
    return Boolean(this.config.excludeFromBasePrivileges);
  }

  public static from(...privileges: FeaturePrivilege[]) {
    const excludeResult = uniq(privileges.map(p => p.excludeFromBasePrivileges));
    if (excludeResult.length !== 1) {
      throw new Error(
        `Unable to construct Feature Privilege from privileges with mixed "excludeFromBasePrivileges" flags.`
      );
    }

    const mergedConfig: FeatureKibanaPrivileges = merge(Object.create(null), ...privileges);
    return new FeaturePrivilege(mergedConfig);
  }
}
