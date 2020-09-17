/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface SystemEcs {
  audit?: AuditEcs;

  auth?: AuthEcs;
}

export interface AuditEcs {
  package?: PackageEcs;
}

export interface PackageEcs {
  arch?: string[];

  entity_id?: string[];

  name?: string[];

  size?: number[];

  summary?: string[];

  version?: string[];
}

export interface AuthEcs {
  ssh?: SshEcs;
}

export interface SshEcs {
  method?: string[];

  signature?: string[];
}
