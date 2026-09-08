/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// eslint-disable-next-line @elastic/eui/no-restricted-eui-imports -- This is common code (client+server), useEuiTheme cannot be used here
import { euiLightVars as theme } from '@kbn/ui-theme';

export const MINIMUM_GROUP_SIZE = 4;

export const DEFAULT_EDGE_COLOR = theme.euiColorMediumShade;
export const DEFAULT_EDGE_STROKE_WIDTH = 1;

export const DEFAULT_MARKER_SIZE = 12;
export const DEFAULT_EDGE_STYLE = {
  stroke: DEFAULT_EDGE_COLOR,
  strokeWidth: DEFAULT_EDGE_STROKE_WIDTH,
} as const;

/** Service names that should be filtered out */
export const FORBIDDEN_SERVICE_NAMES = ['constructor'];
export const SERVICE_MAP_TIMEOUT_ERROR = 'ServiceMapTimeoutError';

/**
 * Span types and subtypes that should NOT be grouped.
 * Key is span type, value is array of subtypes ('all' means all subtypes).
 */
export const NONGROUPED_SPANS: Record<string, string[]> = {
  aws: ['servicename'],
  cache: ['all'],
  db: ['all'],
  external: ['graphql', 'grpc', 'websocket'],
  template: ['handlebars'],
};

// 'external' with 'http' subtype are groupable nodes used in the tests
export const GROUPABLE_SPAN_TYPE = 'external';
export const GROUPABLE_SPAN_SUBTYPE = 'http';

// Node dimensions for React Flow service map
export const SERVICE_NODE_CIRCLE_SIZE = 56;
export const DEPENDENCY_NODE_DIAMOND_SIZE = 48;

/** Border width (px) for service and dependency nodes when not selected. */
export const NODE_BORDER_WIDTH_DEFAULT = 3;
/** Border width (px) for service and dependency nodes when selected. */
export const NODE_BORDER_WIDTH_SELECTED = 4;
// When rotated 45deg, the diagonal becomes the width/height: size * sqrt(2)
export const DEPENDENCY_NODE_DIAMOND_CONTAINER_SIZE = Math.ceil(
  DEPENDENCY_NODE_DIAMOND_SIZE * Math.SQRT2
);

// Dagre layout constants
export const NODE_WIDTH = 200;
export const NODE_HEIGHT = 80;
export const RANK_SEPARATION = 120;
export const NODE_SEPARATION = 80;
export const GRAPH_MARGIN = 50;

/**
 * Below this node count the service map is never folded into serpentine bands: small maps already
 * fit the viewport, and folding them just adds visual noise.
 */
export const FOLD_MIN_NODE_COUNT = 12;

/**
 * Only fold a Dagre layout when its long axis is at least this many times its short axis. A graph
 * that is already roughly square (within this ratio) is left untouched.
 */
export const FOLD_ASPECT_RATIO_THRESHOLD = 2.5;

/**
 * Target aspect ratio (long axis / short axis) of the folded serpentine *cell grid* — that is, the
 * ranks-per-band × band-count grid, sizing each rank as one cell. `1` aims for a square grid; the
 * band count is derived from this and the rank count so the choice stays stable even when a few
 * ranks fan out far taller than the rest (those outliers must not stretch the bands back out into a
 * near-straight line). Kept at a square target so deep chains fold into a compact block rather than
 * a few very long rows.
 */
export const FOLD_TARGET_ASPECT_RATIO = 1.0;

/**
 * Fraction of edges that must connect adjacent ranks (Dagre layers) before folding is allowed.
 * Folding wraps the rank axis, so layouts whose edges mostly hop between neighbouring ranks stay
 * clean; graphs with many long-range edges are left as the standard Dagre layout to avoid turning
 * those edges into long diagonals.
 */
export const FOLD_MIN_LOCAL_EDGE_FRACTION = 0.6;
