/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UMGqlRange, UMPingSortDirectionArg } from '../../../common/domain_types';
import { DocCount, HistogramSeries, Ping, PingResults } from '../../../common/graphql/types';
import { UMPingsAdapter } from '../adapters/pings';

export class UMPingsDomain {
  constructor(private readonly adapter: UMPingsAdapter, libs: {}) {
    this.adapter = adapter;
  }

  public async getAll(
    request: any,
    dateRangeStart: number,
    dateRangeEnd: number,
    monitorId?: string,
    status?: string,
    sort?: UMPingSortDirectionArg,
    size?: number
  ): Promise<PingResults> {
    return this.adapter.getAll(
      request,
      dateRangeStart,
      dateRangeEnd,
      monitorId,
      status,
      sort,
      size
    );
  }

  public async getLatestMonitorDocs(
    request: any,
    dateRangeStart: number,
    dateRangeEnd: number,
    monitorId?: string
  ): Promise<Ping[]> {
    return this.adapter.getLatestMonitorDocs(request, dateRangeStart, dateRangeEnd, monitorId);
  }

  public async getHist(
    request: any,
    range: UMGqlRange,
    filters?: string
  ): Promise<HistogramSeries[] | null> {
    return this.adapter.getPingHistogram(request, range, filters);
  }

  public async getDocCount(request: any): Promise<DocCount> {
    return this.adapter.getDocCount(request);
  }
}
