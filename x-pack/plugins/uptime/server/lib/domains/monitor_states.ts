/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UMMonitorStatesAdapter } from '../adapters/monitor_states';

export class UMMonitorStatesDomain {
  constructor(private readonly adapter: UMMonitorStatesAdapter, libs: {}) {
    this.adapter = adapter;
  }

  public async getMonitorStates(request: any): Promise<any> {
    return this.adapter.getMonitorStates(request);
  }
}
