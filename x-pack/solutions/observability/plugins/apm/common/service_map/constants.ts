/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const MINIMUM_GROUP_SIZE = 4;

export const DEFAULT_EDGE_COLOR = '#98A2B3';
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
