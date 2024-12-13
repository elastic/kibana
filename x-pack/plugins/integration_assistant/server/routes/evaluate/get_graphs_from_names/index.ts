/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EcsGraphMetadata, GRAPH_MAP } from '../../../graphs';

export interface GetGraphsFromNamesResults {
  ecsGraphs: EcsGraphMetadata[];
}

export const getGraphsFromNames = (graphNames: string[]): GetGraphsFromNamesResults =>
  graphNames.reduce<GetGraphsFromNamesResults>(
    (acc, graphName) => {
      const graph = GRAPH_MAP[graphName];
      if (graph != null) {
        return { ...acc, ecsGraphs: [...acc.ecsGraphs, graph] };
      }
      return acc;
    },
    {
      ecsGraphs: [],
    }
  );
