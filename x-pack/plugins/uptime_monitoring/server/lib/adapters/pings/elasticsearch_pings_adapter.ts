/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { INDEX_NAMES } from '../../../../common/constants/index_names';
import { UMPingSortDirectionArg } from '../../../../common/domain_types';
import { Ping } from '../../../../common/graphql/types';
import { DatabaseAdapter } from '../database';
import { UMPingsAdapter } from './adapter_types';

export class ElasticsearchPingsAdapter implements UMPingsAdapter {
  private database: DatabaseAdapter;

  constructor(database: DatabaseAdapter) {
    this.database = database;
  }

  public async getAll(request: any, sort?: UMPingSortDirectionArg, size?: number): Promise<Ping[]> {
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

    return hits.map(({ _source }: any) => {
      const timestamp = _source['@timestamp'];
      return { timestamp, ..._source };
    });
  }
}
