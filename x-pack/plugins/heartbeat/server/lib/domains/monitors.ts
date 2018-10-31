/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { HBMonitor } from 'x-pack/plugins/heartbeat/common/domain_types';
import { HBMonitorsAdapter } from '../adapters/monitors';

export class HBMonitorsDomain {
  constructor(private readonly adapter: HBMonitorsAdapter, libs: {}) {
    this.adapter = adapter;
  }

  public async getAll(request: any): Promise<HBMonitor[]> {
    return this.adapter.getAll(request);
  }
}
