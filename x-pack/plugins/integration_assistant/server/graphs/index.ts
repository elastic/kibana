/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EcsGraph, getEcsGraph } from './ecs/graph';
import { EcsGraphParams } from './ecs/types';

export type GetEcsGraph = (params: EcsGraphParams) => EcsGraph;
export type GraphType = 'ecs';

export interface EcsGraphMetadata {
  getEcsGraph: GetEcsGraph;
  graphType: 'ecs';
}

export type GraphMetadata = EcsGraphMetadata;

/**
 * Map of the different Automatic Import graphs. Useful for running evaluations.
 */
export const GRAPH_MAP: Record<string, GraphMetadata> = {
  ecs: {
    getEcsGraph,
    graphType: 'ecs',
  },
};
