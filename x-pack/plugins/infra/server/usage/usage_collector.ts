/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KbnServer } from '../kibana.index';

const KIBANA_REPORTING_TYPE = 'infraops';

export class UsageCollector {
  public static getUsageCollector(server: KbnServer) {
    const { collectorSet } = server.usage;

    return collectorSet.makeUsageCollector({
      type: KIBANA_REPORTING_TYPE,
      fetch: async () => {
        const report = {
          hits: {
            infraops_hosts: this.infraopsHosts,
            infraops_docker: this.infraopsDocker,
            infraops_kubernetes: this.infraopsKubernetes,
            logs: this.logs + 0,
          },
        };
        this.resetCounters();
        return report;
      },
    });
  }

  public static countHost() {
    this.infraopsHosts += 1;
  }

  public static countDocker() {
    this.infraopsDocker += 1;
  }

  public static countKubernetes() {
    this.infraopsKubernetes += 1;
  }

  public static countLogs() {
    this.logs += 1;
  }

  private static infraopsHosts = 0;
  private static infraopsDocker = 0;
  private static infraopsKubernetes = 0;
  private static logs = 0;

  private static resetCounters() {
    this.infraopsHosts = 0;
    this.infraopsDocker = 0;
    this.infraopsKubernetes = 0;
    this.logs = 0;
  }
}
