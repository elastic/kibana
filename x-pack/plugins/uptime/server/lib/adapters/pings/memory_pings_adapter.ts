/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { take } from 'lodash';
import { UMPingSortDirectionArg } from '../../../../common/domain_types';
import { DocCount, HistogramSeries, Ping, PingResults } from '../../../../common/graphql/types';
import { UMPingsAdapter } from './adapter_types';

const sortPings = (sort: UMPingSortDirectionArg) =>
  sort === 'asc'
    ? (a: Ping, b: Ping) => (Date.parse(a.timestamp) > Date.parse(b.timestamp) ? 1 : 0)
    : (a: Ping, b: Ping) => (Date.parse(a.timestamp) > Date.parse(b.timestamp) ? 0 : 1);

export class MemoryPingsAdapter implements UMPingsAdapter {
  private pingsDB: Ping[];

  constructor(pingsDB: Ping[]) {
    this.pingsDB = pingsDB;
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
    let pings = this.pingsDB;
    if (monitorId) {
      pings = pings.filter(ping => ping.monitor && ping.monitor.id === monitorId);
    }

    size = size ? size : 10;
    return {
      total: size,
      pings: take(sort ? pings.sort(sortPings(sort)) : pings, size),
    };
  }

  // TODO implement
  public async getLatestMonitorDocs(
    request: any,
    dateRangeStart: number,
    dateRangeEnd: number,
    monitorId?: string
  ): Promise<Ping[]> {
    throw new Error('Method not implemented.');
  }
  // TODO implement
  public async getPingHistogram(request: any): Promise<HistogramSeries[] | null> {
    throw new Error('Method not implemented.');
  }

  public async getDocCount(request: any): Promise<DocCount> {
    throw new Error('Method not implemented.');
  }
}
