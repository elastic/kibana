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

export const ProjectBrowserMonitorCodec = t.intersection([
  t.interface({
    id: t.string,
    name: t.string,
    schedule: t.number,
    content: t.string,
    locations: t.array(t.string),
  }),
  t.partial({
    throttling: ProjectMonitorThrottlingConfigCodec,
    screenshot: ScreenshotOptionCodec,
    tags: t.array(t.string),
    ignoreHTTPSErrors: t.boolean,
    apmServiceName: t.string,
    playwrightOptions: t.record(t.string, t.unknown),
    filter: t.interface({
      match: t.string,
    }),
    params: t.record(t.string, t.unknown),
    enabled: t.boolean,
  }),
]);

export const ProjectMonitorsRequestCodec = t.interface({
  project: t.string,
  keep_stale: t.boolean,
  monitors: t.array(ProjectBrowserMonitorCodec),
});

export type ProjectMonitorThrottlingConfig = t.TypeOf<typeof ProjectMonitorThrottlingConfigCodec>;

export type ProjectBrowserMonitor = t.TypeOf<typeof ProjectBrowserMonitorCodec>;

export type ProjectMonitorsRequest = t.TypeOf<typeof ProjectMonitorsRequestCodec>;
