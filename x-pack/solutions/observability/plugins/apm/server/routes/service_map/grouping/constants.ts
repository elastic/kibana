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
/** ...and at least this many neighbours. */
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
/** A split is rejected when more than this share of the services lands in tiny parts. */
export const SPLIT_MAX_TINY_PART_SHARE = 0.3;
/** Parts this small count as tiny when judging a split. */
export const SPLIT_TINY_PART_MAX_SIZE = 3;
