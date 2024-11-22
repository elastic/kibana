/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import type { KVState, ChatModels } from '../../types';

export interface KVBaseNodeParams {
  state: KVState;
}

export interface KVNodeParams extends KVBaseNodeParams {
  model: ChatModels;
}

export interface KVGraphParams {
  client: IScopedClusterClient;
  model: ChatModels;
}

export interface HandleKVNodeParams extends KVNodeParams {
  client: IScopedClusterClient;
}
