/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import assert from 'assert';
import type { SearchHit, SearchResponse } from '@elastic/elasticsearch/lib/api/types';
import type { Stored } from '../types';
import type { IndexNameProvider } from './rule_migrations_data_client';

export class RuleMigrationsDataBaseClient {
  constructor(
    protected getIndexName: IndexNameProvider,
    protected username: string,
    protected esClient: ElasticsearchClient,
    protected logger: Logger
  ) {}

  protected processResponseHits<T extends object>(
    response: SearchResponse<T>,
    override?: Partial<T>
  ): Array<Stored<T>> {
    return this.processHits(response.hits.hits, override);
  }

  protected processHits<T extends object>(
    hits: Array<SearchHit<T>> = [],
    override: Partial<T> = {}
  ): Array<Stored<T>> {
    return hits.map(({ _id, _source }) => {
      assert(_id, 'document should have _id');
      assert(_source, 'document should have _source');
      return { ..._source, ...override, id: _id };
    });
  }

  protected getTotalHits(response: SearchResponse) {
    return typeof response.hits.total === 'number'
      ? response.hits.total
      : response.hits.total?.value ?? 0;
  }
}
