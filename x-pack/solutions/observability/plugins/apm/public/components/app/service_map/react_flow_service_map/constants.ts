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

/** Default node size in pixels when measured dimensions are not available */
export const DEFAULT_NODE_SIZE = 56;

/** Off-screen position for hidden elements (ensures they don't flash on screen) */
export const OFFSCREEN_POSITION = -10000;

/** Divisor for calculating popover offset from edge midpoint */
export const EDGE_OFFSET_DIVISOR = 4;

/** Duration of the center animation in milliseconds */
export const CENTER_ANIMATION_DURATION_MS = 200;

/** Minimum distance threshold for directional keyboard navigation (in pixels) */
export const DIRECTION_THRESHOLD = 50;

/**
 * Mock EUI theme colors for testing purposes.
 * These match the light theme values and are used to mock useEuiTheme in tests.
 */
export const MOCK_EUI_THEME = {
  colors: {
    primary: '#0077CC',
    mediumShade: '#98A2B3',
    primaryText: '#0077CC',
    textPrimary: '#1a1c21',
    emptyShade: '#fff',
    backgroundBasePlain: '#fff',
    textParagraph: '#343741',
    text: '#343741',
    lightShade: '#D3DAE6',
    success: '#00BFB3',
    warning: '#FEC514',
    danger: '#BD271E',
  },
} as const;

/**
 * Mock primary color for testing (matches EUI light theme primary color)
 */
export const MOCK_PRIMARY_COLOR = MOCK_EUI_THEME.colors.primary;

/**
 * Mock default/medium shade color for testing (matches EUI light theme mediumShade)
 */
export const MOCK_DEFAULT_COLOR = MOCK_EUI_THEME.colors.mediumShade;
