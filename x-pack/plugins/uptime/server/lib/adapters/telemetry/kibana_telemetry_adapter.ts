/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export class KibanaTelemetryAdapter {
  public static initUsageCollector(server: any) {
    const { collectorSet } = server.usage;
    return collectorSet.makeUsageCollector({
      type: 'uptime',
      fetch: async () => ({
        uptime_report: {
          hits: {
            uptime_monitors: 1,
          },
        },
      }),
    });
  }
}
