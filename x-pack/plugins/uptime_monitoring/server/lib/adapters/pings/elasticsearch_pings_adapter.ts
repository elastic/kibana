/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Request } from 'hapi';
import { INDEX_NAMES } from '../../../../common/constants/index_names';
import { HBPingSortDirectionArg } from '../../../../common/domain_types';
import { Ping } from '../../../../common/graphql/types';
import { DatabaseAdapter } from '../database';
import { HBPingsAdapter } from './adapter_types';

export class ElasticsearchPingsAdapter implements HBPingsAdapter {
  private database: DatabaseAdapter;

  constructor(database: DatabaseAdapter) {
    this.database = database;
  }

  public async getAll(
    request: Request,
    sort?: HBPingSortDirectionArg,
    size?: number
  ): Promise<Ping[]> {
    const sortParam = sort ? { sort: [{ '@timestamp': { order: sort } }] } : undefined;
    const sizeParam = size ? { size } : undefined;
    const params = {
      index: INDEX_NAMES.HEARTBEAT,
      body: {
        query: {
          match_all: {},
        },
        ...sortParam,
        ...sizeParam,
      },
    };
    const {
      hits: { hits },
    } = await this.database.search(request, params);

    return hits.map(({ _source, _source: { monitor } }: any) => {
      const timestamp = _source['@timestamp'];
      return { timestamp, ..._source };
    });
  }
}
