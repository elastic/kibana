/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UMGqlRange } from '../../../common/domain_types';

export class UMMonitorsDomain {
  constructor(private readonly adapter: UMMonitorsDomain, libs: {}) {
    this.adapter = adapter;
  }

  public async getLatestMonitors(request: any, range: UMGqlRange): Promise<any> {
    return this.adapter.getLatestMonitors(request, range);
  }

  public async getSnapshotCount(
    request: any,
    range: UMGqlRange,
    downCount: number,
    windowSize: number
  ): Promise<any> {
    return this.adapter.getSnapshotCount(request, range, downCount, windowSize);
  }
}
