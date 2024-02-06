/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface EntityStoreEntity {
  '@timestamp': string;
  entity_type?: string;
  first_seen?: string;
  last_seen?: string;
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
      platform?: string[];
      version?: string[];
    };
    risk?: {
      calculated_level?: string;
      calculated_score?: number;
      calculated_score_norm?: number;
    };
    asset?: {
      criticality?: string;
    };
  };
  agent?: {
    type?: string[];
    id?: string[];
  };
  cloud?: {
    provider?: string[];
    region?: string[];
  };
}

export type NewEntityStoreEntity = Omit<EntityStoreEntity, 'id'>;
