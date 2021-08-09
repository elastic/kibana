/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Role } from './role';

export interface ApiKey {
  id: string;
  name: string;
  username: string;
  realm: string;
  creation: number;
  expiration: number;
  invalidated: boolean;
  metadata: Record<string, any>;
}

export interface ApiKeyToInvalidate {
  id: string;
  name: string;
}

export type ApiKeyRoleDescriptors = Record<string, Role['elasticsearch']>;
