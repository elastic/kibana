/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getDefaultAssistantGraph,
  GetDefaultAssistantGraphParams,
  DefaultAssistantGraph,
} from './default_assistant_graph/graph';

export type GetAssistantGraph = (params: GetDefaultAssistantGraphParams) => DefaultAssistantGraph;

/**
 * Map of the different Assistant Graphs. Useful for running evaluations.
 */
export const ASSISTANT_GRAPH_MAP: Record<string, GetAssistantGraph> = {
  DefaultAssistantGraph: getDefaultAssistantGraph,
  // TODO: Support additional graphs
  // AttackDiscoveryGraph: getDefaultAssistantGraph,
};
