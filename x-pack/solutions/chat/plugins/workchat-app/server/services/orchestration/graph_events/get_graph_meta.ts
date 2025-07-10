/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface BaseGraphMeta {
  /** The graph name */
  graphName: string;
}

/**
 * Generates the base set of meta to be used as `metadata` when running a langchain graph.
 *
 * This is meant to be called for all our graphs, to ensure that each graph has
 * the correct metadata for the graph converters to properly retrieve their corresponding events.
 */
export const getGraphMeta = ({ graphName }: { graphName: string }): BaseGraphMeta => {
  return {
    graphName,
  };
};
