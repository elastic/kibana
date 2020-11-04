/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface HostEcs {
  architecture?: string[];

  id?: string[];

  ip?: string[];

  mac?: string[];

  name?: string[];

  os?: OsEcs;

  type?: string[];
}

export interface OsEcs {
  platform?: string[];

  name?: string[];

  full?: string[];

  family?: string[];

  version?: string[];

  kernel?: string[];
}
