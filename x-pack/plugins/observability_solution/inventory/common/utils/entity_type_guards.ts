/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentName } from '@kbn/elastic-agent-utils';
import type { InventoryEntityLatest } from '../entities';

interface EntityMap {
  host: InventoryEntityLatest & { cloud?: { provider?: string[] } };
  container: InventoryEntityLatest & { cloud?: { provider?: string[] } };
  service: InventoryEntityLatest & {
    agent?: { name: AgentName[] };
    service?: { name: string; environment?: string };
  };
}

export const isEntityOfType = <T extends keyof EntityMap>(
  type: T,
  entity: InventoryEntityLatest
): entity is EntityMap[T] => {
  return entity.entityType === type;
};
