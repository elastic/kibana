/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Constants and utility functions for the dependency graph workflow.
 */

/** Elasticsearch index for materialized graph documents */
export const GRAPH_INDEX = '.apm-dependency-graph';

/** Prefix for external dependency node IDs */
const EXTERNAL_NODE_PREFIX = '>';

/**
 * Builds a node ID for an external dependency.
 * External nodes are prefixed with ">" to distinguish them from service nodes.
 *
 * @param resource - The destination resource identifier (e.g., "postgresql/orders")
 * @returns Node ID string like ">postgresql/orders"
 * @throws if resource is empty
 */
export const buildExternalNodeId = (resource: string): string => {
  if (!resource) {
    throw new Error('Cannot build external node ID from empty resource');
  }
  return `${EXTERNAL_NODE_PREFIX}${resource}`;
};
