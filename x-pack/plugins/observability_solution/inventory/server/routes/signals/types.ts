/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Entity } from '../../../common/entities';

export interface EntityWithSignalCount extends Pick<Entity, 'type' | 'displayName'> {
  alerts: { active: number; total: number };
  slos: { healthy: number; violated: number; degraded: number; no_data: number };
}

export interface EntitySignalCountLookupTable {
  entities: EntityWithSignalCount[];
}
