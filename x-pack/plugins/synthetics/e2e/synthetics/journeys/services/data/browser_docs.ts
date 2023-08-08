/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DocOverrides } from './sample_docs';

export const getGeoData = (locationName?: string) => ({
  observer: {
    geo: {
      name: locationName ?? 'North America - US Central',
      location: '41.8780, 93.0977',
    },
    name: locationName ?? 'North America - US Central',
  },
});

export const journeySummary = ({
  name,
  timestamp,
  monitorId,
  testRunId,
  locationName,
}: DocOverrides = {}) => {
  return {
    ...getGeoData(locationName),
    summary: {
      up: 1,
      down: 0,
    },
    test_run_id: testRunId ?? '07e339f4-4d56-4cdb-b314-96faacaee645',
    agent: {
      name: 'job-88fe737c53c39aea-lp69x',
      id: '049c1703-b4bd-45fa-8715-61812add68c0',
      type: 'heartbeat',
      ephemeral_id: 'e5a562a7-0fff-4684-bb5d-93abf7a754be',
      version: '8.6.0',
    },
    synthetics: {
      journey: {
        name: 'inline',
        id: 'inline',
        tags: null,
      },
      type: 'heartbeat/summary',
    },
    monitor: {
      duration: {
        us: 2218379,
      },
      origin: 'ui',
      name: name ?? 'https://www.google.com',
      check_group: testRunId ?? '6e7ce5d2-8756-11ed-98ca-6a95015d8678',
      id: monitorId ?? '07e339f4-4d56-4cdb-b314-96faacaee645',
      timespan: {
        lt: '2022-12-29T09:04:45.789Z',
        gte: '2022-12-29T08:54:45.789Z',
      },
      type: 'browser',
      status: 'up',
    },
    url: {
      path: '/',
      scheme: 'https',
      port: 443,
      domain: 'www.google.com',
      full: 'https://www.google.com/',
    },
    '@timestamp': timestamp ?? '2022-12-29T08:54:44.502Z',
    ecs: {
      version: '8.0.0',
    },
    config_id: '07e339f4-4d56-4cdb-b314-96faacaee645',
    data_stream: {
      namespace: 'default',
      type: 'synthetics',
      dataset: 'browser',
    },
    run_once: true,
    state: {
      duration_ms: 0,
      checks: 1,
      ends: null,
      started_at: '2022-12-29T08:54:45.845773057Z',
      id: 'default-1855d174b55-0',
      up: 1,
      flap_history: [],
      down: 0,
      status: 'up',
    },
    event: {
      agent_id_status: 'auth_metadata_missing',
      ingested: '2022-12-29T08:54:47Z',
      type: 'heartbeat/summary',
      dataset: 'browser',
    },
  };
};

export const journeyStart = ({
  name,
  timestamp,
  monitorId,
  testRunId,
  locationName,
}: DocOverrides = {}) => ({
  ...getGeoData(locationName),
  test_run_id: testRunId ?? '07e339f4-4d56-4cdb-b314-96faacaee645',
  agent: {
    name: 'job-88fe737c53c39aea-lp69x',
    id: '049c1703-b4bd-45fa-8715-61812add68c0',
    ephemeral_id: 'e5a562a7-0fff-4684-bb5d-93abf7a754be',
    type: 'heartbeat',
    version: '8.6.0',
  },
  package: {
    name: '@elastic/synthetics',
    version: '1.0.0-beta.38',
  },
  os: {
    platform: 'linux',
  },
  synthetics: {
    package_version: '1.0.0-beta.38',
    journey: {
      name: 'inline',
      id: 'inline',
    },
    payload: {
      source:
        '({ page, context, browser, params, request }) => {\n        scriptFn.apply(null, [\n            core_1.step,\n            page,\n            context,\n            browser,\n            params,\n            expect_1.expect,\n            request,\n        ]);\n    }',
      params: {},
    },
    index: 0,
    type: 'journey/start',
  },
  monitor: {
    origin: 'ui',
    name: name ?? 'https://www.google.com',
    check_group: testRunId ?? '6e7ce5d2-8756-11ed-98ca-6a95015d8678',
    id: monitorId ?? '07e339f4-4d56-4cdb-b314-96faacaee645',
    timespan: {
      lt: '2022-12-29T09:04:42.284Z',
      gte: '2022-12-29T08:54:42.284Z',
    },
    type: 'browser',
  },
  '@timestamp': timestamp ?? '2022-12-29T08:54:42.284Z',
  ecs: {
    version: '8.0.0',
  },
  config_id: monitorId ?? '07e339f4-4d56-4cdb-b314-96faacaee645',
  data_stream: {
    namespace: 'default',
    type: 'synthetics',
    dataset: 'browser',
  },
  run_once: true,
  event: {
    agent_id_status: 'auth_metadata_missing',
    ingested: '2022-12-29T08:54:43Z',
    type: 'journey/start',
    dataset: 'browser',
  },
});

export const step1 = ({
  name,
  timestamp,
  monitorId,
  testRunId,
  locationName,
}: DocOverrides = {}) => ({
  ...getGeoData(locationName),
  test_run_id: testRunId ?? 'c16b1614-7f48-4791-8f46-9ccf3a896e20',
  agent: {
    name: 'job-76905d93798e6fff-z6nsb',
    id: '3dcc8177-b2ca-4b52-8e79-66332f6dbc72',
    type: 'heartbeat',
    ephemeral_id: '9b6b4f26-2a70-417a-8732-22ae95a406fa',
    version: '8.6.0',
  },
  package: {
    name: '@elastic/synthetics',
    version: '1.0.0-beta.38',
  },
  os: {
    platform: 'linux',
  },
  synthetics: {
    package_version: '1.0.0-beta.38',
    journey: {
      name: 'inline',
      id: 'inline',
    },
    payload: {
      source: "async () => {\n  await page.goto('https://www.google.com');\n}",
      url: 'https://www.google.com/',
      status: 'succeeded',
    },
    index: 7,
    step: {
      duration: {
        us: 1419377,
      },
      name: 'Go to https://www.google.com',
      index: 1,
      status: 'succeeded',
    },
    type: 'step/end',
  },
  monitor: {
    origin: 'ui',
    name: name ?? 'https://www.google.com',
    check_group: testRunId ?? 'e81de0da-875e-11ed-8f2a-7eb894226a99',
    id: monitorId ?? 'c16b1614-7f48-4791-8f46-9ccf3a896e20',
    timespan: {
      lt: '2022-12-29T10:05:23.730Z',
      gte: '2022-12-29T09:55:23.730Z',
    },
    type: 'browser',
  },
  url: {
    path: '/',
    scheme: 'https',
    port: 443,
    domain: 'www.google.com',
    full: 'https://www.google.com/',
  },
  '@timestamp': timestamp ?? '2022-12-29T09:55:23.729Z',
  ecs: {
    version: '8.0.0',
  },
  config_id: monitorId ?? 'c16b1614-7f48-4791-8f46-9ccf3a896e20',
  data_stream: {
    namespace: 'default',
    type: 'synthetics',
    dataset: 'browser',
  },
  run_once: true,
  event: {
    agent_id_status: 'auth_metadata_missing',
    ingested: '2022-12-29T09:55:24Z',
    type: 'step/end',
    dataset: 'browser',
  },
});

export const step2 = ({
  name,
  timestamp,
  monitorId,
  testRunId,
  locationName,
}: DocOverrides = {}) => ({
  ...getGeoData(locationName),
  test_run_id: testRunId ?? 'c16b1614-7f48-4791-8f46-9ccf3a896e20',
  agent: {
    name: 'job-76905d93798e6fff-z6nsb',
    id: '3dcc8177-b2ca-4b52-8e79-66332f6dbc72',
    ephemeral_id: '9b6b4f26-2a70-417a-8732-22ae95a406fa',
    type: 'heartbeat',
    version: '8.6.0',
  },
  package: {
    name: '@elastic/synthetics',
    version: '1.0.0-beta.38',
  },
  os: {
    platform: 'linux',
  },
  synthetics: {
    package_version: '1.0.0-beta.38',
    journey: {
      name: 'inline',
      id: 'inline',
    },
    payload: {
      source: "async () => {\n  await page.goto('https://www.google.com');\n}",
      url: 'https://www.google.com/',
      status: 'succeeded',
    },
    index: 15,
    step: {
      duration: {
        us: 788024,
      },
      name: 'Go to step 2',
      index: 2,
      status: 'succeeded',
    },
    type: 'step/end',
  },
  monitor: {
    origin: 'ui',
    name: name ?? 'https://www.google.com',
    check_group: testRunId ?? 'e81de0da-875e-11ed-8f2a-7eb894226a99',
    id: monitorId ?? 'c16b1614-7f48-4791-8f46-9ccf3a896e20',
    timespan: {
      lt: '2022-12-29T10:05:24.550Z',
      gte: '2022-12-29T09:55:24.550Z',
    },
    type: 'browser',
  },
  url: {
    path: '/',
    scheme: 'https',
    port: 443,
    domain: 'www.google.com',
    full: 'https://www.google.com/',
  },
  '@timestamp': timestamp ?? '2022-12-29T09:55:24.520Z',
  ecs: {
    version: '8.0.0',
  },
  config_id: monitorId ?? 'c16b1614-7f48-4791-8f46-9ccf3a896e20',
  data_stream: {
    namespace: 'default',
    type: 'synthetics',
    dataset: 'browser',
  },
  run_once: true,
  event: {
    agent_id_status: 'auth_metadata_missing',
    ingested: '2022-12-29T09:55:24Z',
    type: 'step/end',
    dataset: 'browser',
  },
});
