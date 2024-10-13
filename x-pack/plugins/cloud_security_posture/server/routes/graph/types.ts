/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  EdgeDataModel,
  NodeDataModel,
} from '@kbn/cloud-security-posture-common/types/graph/latest';
import type { Logger, IScopedClusterClient } from '@kbn/core/server';
import type { Writable } from '@kbn/utility-types';

export interface GraphContextServices {
  logger: Logger;
  esClient: IScopedClusterClient;
}

export interface GraphContext {
  nodes: Array<Writable<NodeDataModel>>;
  edges: Array<Writable<EdgeDataModel>>;
}
