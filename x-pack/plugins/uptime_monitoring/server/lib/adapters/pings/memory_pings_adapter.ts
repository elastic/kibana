/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { take } from 'lodash';
import { UMPingSortDirectionArg } from '../../../../common/domain_types';
import { HistogramSeries, Ping } from '../../../../common/graphql/types';
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
  ): Promise<Ping[]> {
    let pings = this.pingsDB;
    if (monitorId) {
      pings = pings.filter(ping => ping.monitor && ping.monitor.id === monitorId);
    }
    if (sort) {
      const sortedPings = pings.sort(sortPings(sort));
      return take(sortedPings, size ? size : 10);
    }
    return take(pings, size ? size : 10);
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
}
