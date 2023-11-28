/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SOShard } from '../../common/types';
interface PackQuery {
  id: string;
  name: string;
  query: string;
  interval: number;
  snapshot?: boolean;
  removed?: boolean;
  ecs_mapping?: Record<string, unknown>;
}

export interface PackResponseData {
  saved_object_id: string;
  name: string;
  description: string | undefined;
  queries: PackQuery[];
  version?: number;
  enabled: boolean | undefined;
  created_at: string;
  created_by: string | undefined;
  updated_at: string;
  updated_by: string | undefined;
  policy_ids?: string[];
  shards?: SOShard;
}

export interface ReadPackResponseData {
  saved_object_id: string;
  name: string;
  description: string | undefined;
  queries: Record<string, PackQuery>;
  version?: number;
  enabled: boolean | undefined;
  created_at: string;
  created_by: string | undefined;
  updated_at: string;
  updated_by: string | undefined;
  policy_ids?: string[];
  shards: Record<string, number>;
  read_only?: boolean;
  type: string;
  namespaces?: string[];
  migrationVersion?: Record<string, string>;
  managed?: boolean;
  coreMigrationVersion?: string;
}
