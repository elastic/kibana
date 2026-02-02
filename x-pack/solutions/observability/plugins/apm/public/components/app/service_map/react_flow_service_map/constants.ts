/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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

/** Padding around the graph when fitting the view (as a ratio) */
export const FIT_VIEW_PADDING = 0.2;

/** Duration of the fit view animation in milliseconds */
export const FIT_VIEW_DURATION = 200;

/** Size of the default marker */
export const DEFAULT_MARKER_SIZE = 12;

/** Size of the highlighted marker */
export const HIGHLIGHTED_MARKER_SIZE = 14;

/** Width of the default stroke */
export const DEFAULT_STROKE_WIDTH = 1;

/** Width of the highlighted stroke */
export const HIGHLIGHTED_STROKE_WIDTH = 2;
