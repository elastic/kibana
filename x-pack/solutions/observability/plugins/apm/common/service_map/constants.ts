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
/** Border width (px) for service and dependency nodes when selected or critical. */
export const NODE_BORDER_WIDTH_SELECTED = 4;
// When rotated 45deg, the diagonal becomes the width/height: size * sqrt(2)
export const DEPENDENCY_NODE_DIAMOND_CONTAINER_SIZE = Math.ceil(
  DEPENDENCY_NODE_DIAMOND_SIZE * Math.SQRT2
);
