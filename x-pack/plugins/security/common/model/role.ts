/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IndexPrivilege } from './index_privilege';
import { KibanaPrivilege } from './kibana_privilege';

export interface Role {
  name: string;
  elasticsearch: {
    cluster: string[];
    indices: IndexPrivilege[];
    run_as: string[];
  };
  kibana: {
    global: KibanaPrivilege[];
    space: {
      [spaceId: string]: KibanaPrivilege[];
    };
  };
  metadata?: {
    [anyKey: string]: any;
  };
  transient_metadata?: {
    [anyKey: string]: any;
  };
}
