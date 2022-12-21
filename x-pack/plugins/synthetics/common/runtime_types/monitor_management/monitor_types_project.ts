/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { ScreenshotOptionCodec } from './monitor_configs';

export const ProjectMonitorThrottlingConfigCodec = t.interface({
  download: t.number,
  upload: t.number,
  latency: t.number,
});

export const ProjectMonitorCodec = t.intersection([
  t.interface({
    type: t.string,
    id: t.string,
    name: t.string,
    schedule: t.number,
    locations: t.array(t.string),
  }),
  t.partial({
    content: t.string,
    timeout: t.string,
    privateLocations: t.array(t.string),
    throttling: ProjectMonitorThrottlingConfigCodec,
    screenshot: ScreenshotOptionCodec,
    tags: t.union([t.string, t.array(t.string)]),
    ignoreHTTPSErrors: t.boolean,
    playwrightOptions: t.record(t.string, t.unknown),
    filter: t.interface({
      match: t.string,
    }),
    params: t.record(t.string, t.unknown),
    enabled: t.boolean,
    urls: t.union([t.string, t.array(t.string)]),
    hosts: t.union([t.string, t.array(t.string)]),
    max_redirects: t.string,
    wait: t.string,
    hash: t.string,
  }),
]);

export const ProjectMonitorsRequestCodec = t.interface({
  monitors: t.array(ProjectMonitorCodec),
});

export const LegacyProjectMonitorsRequestCodec = t.interface({
  project: t.string,
  keep_stale: t.boolean,
  monitors: t.array(ProjectMonitorCodec),
});

export const ProjectMonitorMetaDataCodec = t.interface({
  hash: t.string,
  journey_id: t.string,
});

export const ProjectMonitorsResponseCodec = t.intersection([
  t.interface({
    total: t.number,
    monitors: t.array(ProjectMonitorMetaDataCodec),
  }),
  t.partial({
    after_key: t.string,
  }),
]);

export type ProjectMonitorThrottlingConfig = t.TypeOf<typeof ProjectMonitorThrottlingConfigCodec>;

export type ProjectMonitor = t.TypeOf<typeof ProjectMonitorCodec>;

export type LegacyProjectMonitorsRequest = t.TypeOf<typeof LegacyProjectMonitorsRequestCodec>;

export type ProjectMonitorsRequest = t.TypeOf<typeof ProjectMonitorsRequestCodec>;

export type ProjectMonitorsResponse = t.TypeOf<typeof ProjectMonitorsResponseCodec>;

export type ProjectMonitorMetaData = t.TypeOf<typeof ProjectMonitorMetaDataCodec>;
