/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Headers for the APM plugin's internal APIs. */
export const COMMON_HEADERS = {
  'kbn-xsrf': 'scout',
  'x-elastic-internal-origin': 'kibana',
  'elastic-api-version': '1',
  Accept: 'application/json',
};

// Service map stats: a whole hour on its own day, apart from the metrics data, so every rollup
// (1m, 10m and 60m) covers the same transactions
export const SERVICE_MAP_STATS_START_DATE = '2021-10-11T00:00:00.000Z';
export const SERVICE_MAP_STATS_END_DATE = '2021-10-11T01:00:00.000Z';

export const SERVICE_MAP_STATS_FRONTEND = 'map-stats-frontend';
export const SERVICE_MAP_STATS_BACKEND = 'map-stats-backend';
export const SERVICE_MAP_STATS_WORKER = 'map-stats-worker';

/** Transactions per minute and durations, which the stats are checked against. */
export const SERVICE_MAP_STATS_DATA = {
  frontend: {
    // `GET /api`: successful and failed; `GET /other`: successful
    apiSuccessPerMinute: 2,
    apiFailurePerMinute: 1,
    otherPerMinute: 1,
    durationMs: 100,
  },
  backend: {
    // `request` is a default type, so it wins over the busier `custom` type
    requestPerMinute: 1,
    requestDurationMs: 50,
    customPerMinute: 3,
    customDurationMs: 10,
  },
  worker: {
    // No default type, so the busiest type is used
    jobPerMinute: 2,
    jobDurationMs: 200,
  },
} as const;

// Service map grouping: on its own day, so neither this data nor the service map stats data falls
// in the other's map or in the day of calls grouping reads
export const SERVICE_MAP_GROUPING_START_DATE = '2021-10-13T00:00:00.000Z';
export const SERVICE_MAP_GROUPING_END_DATE = '2021-10-13T00:15:00.000Z';
export const SERVICE_MAP_GROUPING_ENVIRONMENT = 'service-map-grouping';

/** 8 teams of 16 services that call each other, the groups grouping by calls should find. */
export const SERVICE_MAP_GROUPING_TEAMS: string[][] = Array.from({ length: 8 }, (_, team) =>
  Array.from(
    { length: 16 },
    (__, member) => `grouping-t${team}-s${String(member).padStart(2, '0')}`
  )
);
/** Called by every team service. */
export const SERVICE_MAP_GROUPING_PLATFORM = ['grouping-platform-0', 'grouping-platform-1'];
/** Calls 5 services per team: 40 neighbours, well above 3 times the 10 of a team service. */
export const SERVICE_MAP_GROUPING_GATEWAY = 'grouping-gateway';
/** The services grouping should put in the shared group: the platform services and the gateway. */
export const SERVICE_MAP_GROUPING_SHARED = [
  ...SERVICE_MAP_GROUPING_PLATFORM,
  SERVICE_MAP_GROUPING_GATEWAY,
];
/** A pair that only call each other. */
export const SERVICE_MAP_GROUPING_ISOLATED = ['grouping-isolated-a', 'grouping-isolated-b'];
/** Services with no calls, and the isolated pair. */
export const SERVICE_MAP_GROUPING_NOT_CONNECTED = [
  'grouping-idle-0',
  'grouping-idle-1',
  ...SERVICE_MAP_GROUPING_ISOLATED,
];

export const SERVICE_MAP_GROUPING_SERVICES = [
  ...SERVICE_MAP_GROUPING_TEAMS.flat(),
  ...SERVICE_MAP_GROUPING_SHARED,
  ...SERVICE_MAP_GROUPING_NOT_CONNECTED,
];
