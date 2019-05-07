/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Server } from 'hapi';

export interface KibanaHapiServer extends Server {
  usage: {
    collectorSet: {
      makeUsageCollector: (collector: object) => any;
    };
  };
}

export function createCollectorFetch(server: Server) {
  return async (): Promise<object | undefined> => {
    const usage = server.config().get(`xpack.telemetry.usage`);

    // don't bother recording `static_telemetry: { }` if there's nothing defined
    return Object.keys(usage).length ? usage : undefined;
  };
}

/**
 * Create a usage collector that provides the `xpack.telemetry.usage` data
 * specified via `kibana.yml` as a `static_telemetry` object.
 *
 * @param server The Kibana server instance.
 * @return `UsageCollector` that provides the `static_telemetry` described.
 */
export function createTelemetryUsageCollector(server: KibanaHapiServer) {
  return server.usage.collectorSet.makeUsageCollector({
    type: 'static_telemetry',
    fetch: createCollectorFetch(server),
  });
}
