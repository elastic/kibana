/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IndexPrivilege } from './index_privilege';
import { FeaturePrivilegeSet } from './privileges/feature_privileges';

export interface Role {
  name: string;
  elasticsearch: {
    cluster: string[];
    indices: IndexPrivilege[];
    run_as: string[];
  };
  kibana: Array<{
    spaces: string[];
    base: string[];
    feature: FeaturePrivilegeSet;
  }>;
  metadata?: {
    [anyKey: string]: any;
  };
  transient_metadata?: {
    [anyKey: string]: any;
  };
  _transform_error?: string[];
}
