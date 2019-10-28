/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FeaturesPrivileges } from './features_privileges';

export interface RoleIndexPrivilege {
  names: string[];
  privileges: string[];
  field_security?: {
    grant?: string[];
    except?: string[];
  };
  query?: string;
}

export interface RoleKibanaPrivilege {
  spaces: string[];
  base: string[];
  feature: FeaturesPrivileges;
  _reserved?: string[];
}

export interface Role {
  name: string;
  elasticsearch: {
    cluster: string[];
    indices: RoleIndexPrivilege[];
    run_as: string[];
  };
  kibana: RoleKibanaPrivilege[];
  metadata?: {
    [anyKey: string]: any;
  };
  transient_metadata?: {
    [anyKey: string]: any;
  };
  _transform_error?: string[];
  _unrecognized_applications?: string[];
}
