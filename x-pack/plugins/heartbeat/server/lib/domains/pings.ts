/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Request } from 'hapi';
import { HBPingSortDirectionArg } from 'x-pack/plugins/heartbeat/common/domain_types';
import { Ping } from 'x-pack/plugins/heartbeat/common/graphql/types';
import { HBPingsAdapter } from '../adapters/pings';

export class HBPingsDomain {
  constructor(private readonly adapter: HBPingsAdapter, libs: {}) {
    this.adapter = adapter;
  }

  public async getAll(
    request: Request,
    sort: HBPingSortDirectionArg,
    size: number
  ): Promise<Ping[]> {
    return this.adapter.getAll(request, sort, size);
  }
}
