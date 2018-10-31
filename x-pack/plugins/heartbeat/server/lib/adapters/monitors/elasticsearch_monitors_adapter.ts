/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { INDEX_NAMES } from 'x-pack/plugins/heartbeat/common/constants/index_names';
import { HBMonitor } from 'x-pack/plugins/heartbeat/common/domain_types';
import { DatabaseAdapter } from '../database';
import { HBMonitorsAdapter } from './adapter_types';

export class ElasticsearchMonitorsAdapter implements HBMonitorsAdapter {
  private database: DatabaseAdapter;

  constructor(database: DatabaseAdapter) {
    this.database = database;
  }

  public async getAll(request: any): Promise<HBMonitor[]> {
    const params = {
      index: INDEX_NAMES.HEARTBEAT + '*',
      body: {
        query: {
          match_all: {},
        },
      },
    };

    return this.database.search(request, params);
  }
}
