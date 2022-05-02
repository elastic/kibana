/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { ScreenshotOptionCodec } from './monitor_configs';

export const PushMonitorThrottlingConfigCodec = t.interface({
  download: t.number,
  upload: t.number,
  latency: t.number,
});

export const PushBrowserMonitorCodec = t.intersection([
  t.interface({ id: t.string, name: t.string, schedule: t.string, content: t.string }),
  t.partial({
    locations: t.array(t.string),
    throttling: PushMonitorThrottlingConfigCodec,
    screenshots: ScreenshotOptionCodec,
    tags: t.array(t.string),
    ignoreHTTPSErrors: t.boolean,
    apmServiceName: t.string,
  }),
]);

export const PushMonitorsRequestCodec = t.interface({
  monitors: t.array(PushBrowserMonitorCodec),
});

export type PushMonitorThrottlingConfig = t.TypeOf<typeof PushMonitorThrottlingConfigCodec>;

export type PushBrowserMonitor = t.TypeOf<typeof PushBrowserMonitorCodec>;

export type PushMonitorsRequest = t.TypeOf<typeof PushMonitorsRequestCodec>;
