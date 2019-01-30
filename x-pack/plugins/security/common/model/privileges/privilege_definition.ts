/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PrivilegeMap } from '../kibana_privilege';
import { FeaturePrivileges } from './feature_privileges';
import { GlobalPrivileges } from './global_privileges';
import { SpacesPrivileges } from './spaces_privileges';

export class PrivilegeDefinition {
  constructor(private readonly privilegeActionMap: PrivilegeMap) {}

  public getGlobalPrivileges() {
    return new GlobalPrivileges(this.privilegeActionMap.global);
  }

  public getSpacesPrivileges() {
    return new SpacesPrivileges(this.privilegeActionMap.space);
  }

  public getFeaturePrivileges() {
    return new FeaturePrivileges(this.privilegeActionMap.features);
  }
}
