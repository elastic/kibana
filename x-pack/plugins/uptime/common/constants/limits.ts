/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/**
 * These limits are intended to prevent the app from
 * querying Elasticsearch in a way that could cause a cluster
 * to slow or perform badly.
 */
export const LIMITS = {
  SERVER: {
    // We stop counting paginated monitors once we get to 30000 items.
    // This limit is somewhat arbitrary and may need to be revisited.
    MONITORS_PAGINATION_MAP_LIMIT: 30000,
    // When counting keys for after_key pagination we can slice our indices
    // by 10000 items per query, which is the default maximum allowed for the underlying aggs.
    MONITORS_PER_PAGINATION_QUERY: 10000,
  },
};
