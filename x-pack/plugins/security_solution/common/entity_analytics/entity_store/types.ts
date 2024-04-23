/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Agent } from '@kbn/fleet-plugin/common';

export interface EntityStoreEntity {
  '@timestamp': string;
  entity_type: string;
  first_seen: string;
  last_seen: string;
  host: {
    architecture?: string[];
    id?: string[];
    ip?: string[];
    ip_history?: Array<{
      timestamp: string;
      ip: string;
    }>;
    name: string;
    os?: {
      platform?: string;
      version?: string;
      name?: string;
      full?: string;
      family?: string;
      kernel?: string;
      type?: string;
      variant?: string;
    };
    os_seen_at?: string;
    risk?: {
      calculated_level?: string;
      calculated_score?: number;
      calculated_score_norm?: number;
    };
    asset?: {
      criticality?: string;
    };
    agent?: Agent;
  };
  cloud?: {
    provider?: string[];
    region?: string[];
  };
}

export type NewEntityStoreEntity = Omit<EntityStoreEntity, 'id'>;

interface BaseEntityHistoryDocument {
  '@timestamp': string;
  entity: EntityStoreEntity;
}
export interface EntityHistoryCreatedDocument extends BaseEntityHistoryDocument {
  created: true;
}

export interface EntityHistoryUpdatedDocument extends BaseEntityHistoryDocument {
  fields_changed: string[];
  previous_values: Partial<EntityStoreEntity>;
}

export type EntityHistoryDocument = EntityHistoryCreatedDocument | EntityHistoryUpdatedDocument;
