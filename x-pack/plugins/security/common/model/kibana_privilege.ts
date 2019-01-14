/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FeaturePrivilegeSet } from './privileges/feature_privileges';
export type FeaturesPrivileges = Record<string, Record<string, string[]>>;

export interface PrivilegeMap {
  global: Record<string, string[]>;
  features: FeaturesPrivileges;
  space: Record<string, string[]>;
}

export interface KibanaPrivilegeSpec {
  spaces: string[];
  base: string[];
  feature: FeaturePrivilegeSet;
}
