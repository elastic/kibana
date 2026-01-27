/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Re-export shared constants from common
export { DEFAULT_EDGE_COLOR } from '../../../../../common/service_map/constants';

/**
 * Layout constants for the React Flow service map (client-side only)
 */

/** Width of each node in pixels */
export const NODE_WIDTH = 200;

/** Height of each node in pixels */
export const NODE_HEIGHT = 80;

/** Vertical spacing between ranks (levels) in the graph */
export const RANK_SEPARATION = 120;

/** Horizontal spacing between nodes at the same rank */
export const NODE_SEPARATION = 80;

/** Margin around the graph edges */
export const GRAPH_MARGIN = 50;
