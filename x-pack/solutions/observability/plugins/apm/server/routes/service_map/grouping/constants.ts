/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Starting points from the prototype, to tune on real estates.

/** Below this many services the map is not grouped. */
export const SERVICE_GROUPING_MIN_SERVICES = 100;

export const SHARED_GROUP_ID = 'shared';
export const NOT_CONNECTED_GROUP_ID = 'notConnected';

/** A service called by at least this share of the estate is shared. */
export const SHARED_MIN_CALLER_SHARE = 0.25;
/** A service with more neighbours than the mean plus this many standard deviations is shared. */
export const SHARED_NEIGHBOUR_STANDARD_DEVIATIONS = 3;
/**
 * A service needs at least this many times the median number of neighbours to be shared for its
 * neighbours. Neighbour counts are skewed, so by chance a few ordinary services sit above the mean
 * plus a few standard deviations.
 */
export const SHARED_MIN_NEIGHBOURS_MEDIAN_MULTIPLE = 3;
/**
 * A service needs at least this many neighbours to be shared for its neighbours, however few the
 * rest have.
 */
export const SHARED_MIN_NEIGHBOURS = 10;
/** At most this share of the estate is shared. */
export const SHARED_MAX_SHARE = 0.05;

/** A piece of the call graph this small, cut off from the rest, is not connected. */
export const NOT_CONNECTED_MAX_PIECE_SIZE = 3;

/** Resolutions tried when inferring groups. Higher values give more, smaller groups. */
export const INFERENCE_RESOLUTIONS = [0.1, 0.25, 0.5, 1, 2, 4] as const;
/** Fewer groups than this read as too coarse. */
export const READABLE_MIN_GROUPS = 7;
/** More groups than this stop being readable as groups. */
export const READABLE_MAX_GROUPS = 50;
/** No group may hold more than this share of the services. */
export const READABLE_MAX_LARGEST_GROUP_SHARE = 0.4;
/** A group with at least this share of its calls inside it is self-contained. */
export const SELF_CONTAINED_CALL_SHARE = 0.5;
/** A run is preferred when at least this share of its groups is self-contained. */
export const SELF_CONTAINED_GROUP_SHARE = 0.9;
/** Groups this small join the neighbouring group they share the most calls with. */
export const TINY_GROUP_MAX_SIZE = 2;

/**
 * Groups found from calls are split above this many services. Best effort: a group whose calls
 * don't split it into parts that are large enough stays whole, even above this size.
 */
export const MAX_GROUP_SIZE = 150;
/** Resolutions tried when splitting a group that is too large. */
export const SPLIT_RESOLUTIONS = [1, 2, 4, 8, 16] as const;
/** A group is split again at most this many times. */
export const MAX_SPLIT_DEPTH = 4;
/**
 * A run, when picking a resolution, or a split of a large group is rejected when more than this
 * share of its services lands in tiny parts: a large group beats a map broken into fragments.
 */
export const MAX_TINY_PART_SHARE = 0.3;
/** Parts this small count as tiny when judging a run or a split. */
export const TINY_PART_MAX_SIZE = 3;

/**
 * Safety limit: community detection stops merging groups after this many
 * levels. Each level at least halves the groups in practice, so real estates stop well before.
 */
export const COMMUNITY_DETECTION_MAX_LEVELS = 20;
/**
 * Safety limit: services stop moving between groups after this many passes,
 * in case rounding errors make two groups trade a service back and forth.
 */
export const COMMUNITY_DETECTION_MAX_PASSES = 50;
/** A move must gain more than this, so a rounding error doesn't count as an improvement. */
export const COMMUNITY_DETECTION_GAIN_TOLERANCE = 1e-12;
