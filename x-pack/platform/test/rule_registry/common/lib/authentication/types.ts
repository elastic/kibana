/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface Space {
  id: string;
  namespace?: string;
  name: string;
  disabledFeatures: string[];
}

export interface User {
  username: string;
  password: string;
  description?: string;
  roles: string[];
}

export interface UserInfo {
  username: string;
  full_name: string;
  email: string;
}

interface FeaturesPrivileges {
  [featureId: string]: string[];
}

interface ElasticsearchIndices {
  names: string[];
  privileges: string[];
}

export interface ElasticSearchPrivilege {
  cluster?: string[];
  indices?: ElasticsearchIndices[];
}

export interface KibanaPrivilege {
  spaces: string[];
  base?: string[];
  feature?: FeaturesPrivileges;
}

export interface Role {
  name: string;
  privileges: {
    elasticsearch?: ElasticSearchPrivilege;
    kibana?: KibanaPrivilege[];
  };
}
