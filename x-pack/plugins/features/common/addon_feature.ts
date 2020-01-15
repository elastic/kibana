/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FeatureKibanaPrivileges } from './feature_kibana_privileges';

export interface AddonFeature {
  id: string;
  name: string;
  privilegeGroups: AddonPrivilegeGroup[];
}

interface AddonPrivilegeGroup {
  type: 'mutually_exclusive' | 'independent';
  privileges: AddonFeaturePrivilege[];
}

export interface AddonFeaturePrivilege extends FeatureKibanaPrivileges {
  id: string;
}
