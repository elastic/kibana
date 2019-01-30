/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RawKibanaFeaturePrivileges } from './privileges/feature_privileges';

export interface RawKibanaPrivileges {
  global: Record<string, string[]>;
  features: RawKibanaFeaturePrivileges;
  space: Record<string, string[]>;
}
