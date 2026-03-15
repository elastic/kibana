/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface User {
  username: string;
  password: string;
  roles: string[];
}

export interface Role {
  name: string;
  privileges: {
    elasticsearch?: {
      indices?: Array<{ names: string[]; privileges: string[] }>;
    };
    kibana?: Array<{
      spaces: string[];
      base?: string[];
      feature?: { [featureId: string]: string[] };
    }>;
  };
}
