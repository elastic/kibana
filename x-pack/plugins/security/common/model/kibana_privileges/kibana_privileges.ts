/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RawKibanaPrivileges } from '../raw_kibana_privileges';
import { KibanaFeaturePrivileges } from './feature_privileges';
import { KibanaGlobalPrivileges } from './global_privileges';
import { KibanaSpacesPrivileges } from './spaces_privileges';

export class KibanaPrivileges {
  constructor(private readonly rawKibanaPrivileges: RawKibanaPrivileges) {}

  public getGlobalPrivileges() {
    return new KibanaGlobalPrivileges(this.rawKibanaPrivileges.global);
  }

  public getSpacesPrivileges() {
    return new KibanaSpacesPrivileges(this.rawKibanaPrivileges.space);
  }

  public getFeaturePrivileges() {
    return new KibanaFeaturePrivileges(this.rawKibanaPrivileges.features);
  }
}
