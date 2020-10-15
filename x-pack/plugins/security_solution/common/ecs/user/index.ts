/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface UserEcs {
  domain?: string[];

  id?: string[];

  name?: string[];

  full_name?: string[];

  email?: string[];

  hash?: string[];

  group?: string[];
}
