/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * This branch of filtering is used for monitors of type `browser`. This monitor
 * type represents an unbounded set of steps, with each `check_group` representing
 * a distinct journey. The document containing the `summary` field is indexed last, and
 * contains the data necessary for querying a journey.
 *
 * Because of this, when querying for "pings", it is important that we treat `browser` summary
 * checks as the "ping" we want. Without this filtering, we will receive >= N pings for a journey
 * of N steps, because an individual step may also contain multiple documents.
 */
export const REMOVE_NON_SUMMARY_BROWSER_CHECKS = {
  must_not: [
    {
      bool: {
        filter: [
          {
            term: {
              'monitor.type': 'browser',
            },
          },
          {
            bool: {
              must_not: [
                {
                  exists: {
                    field: 'summary',
                  },
                },
              ],
            },
          },
        ],
      },
    },
  ],
};
