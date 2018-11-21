/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { take } from 'lodash';
import { UMPingSortDirectionArg } from 'x-pack/plugins/uptime_monitoring/common/domain_types';
import { Ping } from 'x-pack/plugins/uptime_monitoring/common/graphql/types';
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

  public async getAll(request: any, sort?: UMPingSortDirectionArg, size?: number): Promise<Ping[]> {
    if (sort) {
      const sortedPings = this.pingsDB.sort(sortPings(sort));
      return take(sortedPings, size ? size : 10);
    }
    return take(this.pingsDB, size ? size : 10);
  }
}
