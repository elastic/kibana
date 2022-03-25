/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

export const enum PrivilegeType {
  SOURCEMAP = 'sourcemap:write',
  EVENT = 'event:write',
  AGENT_CONFIG = 'config_agent:read',
}

export const privilegesTypeRt = t.array(
  t.union([
    t.literal(PrivilegeType.SOURCEMAP),
    t.literal(PrivilegeType.EVENT),
    t.literal(PrivilegeType.AGENT_CONFIG),
  ])
);
