/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Minimum number of nodes required to form a group
 */
export const MINIMUM_GROUP_SIZE = 4;

/**
 * Default edge color for service map connections
 */
export const DEFAULT_EDGE_COLOR = '#98A2B3';

/**
 * Default edge stroke width
 */
export const DEFAULT_EDGE_STROKE_WIDTH = 1;

/**
 * Default marker size for edge arrows
 */
export const DEFAULT_MARKER_SIZE = 12;

/**
 * Default edge style configuration
 */
export const DEFAULT_EDGE_STYLE = {
  stroke: DEFAULT_EDGE_COLOR,
  strokeWidth: DEFAULT_EDGE_STROKE_WIDTH,
} as const;
