/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

export enum PrivilegeType {
  EVENT = 'event:write',
  AGENT_CONFIG = 'config_agent:read',
}

export enum ClusterPrivilegeType {
  MANAGE_OWN_API_KEY = 'manage_own_api_key',
}

export const privilegesTypeRt = t.array(
  t.union([
    t.literal(PrivilegeType.EVENT),
    t.literal(PrivilegeType.AGENT_CONFIG),
  ])
);
