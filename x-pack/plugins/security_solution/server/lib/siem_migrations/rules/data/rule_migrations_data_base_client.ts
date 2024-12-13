/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  SearchHit,
  SearchRequest,
  SearchResponse,
  Duration,
} from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import assert from 'assert';
import type { Stored } from '../types';
import type { IndexNameProvider } from './rule_migrations_data_client';

const DEFAULT_PIT_KEEP_ALIVE: Duration = '30s' as const;

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

  /** Returns functions to iterate over all the search results in batches */
  protected getSearchBatches<T extends object>(
    search: SearchRequest,
    keepAlive: Duration = DEFAULT_PIT_KEEP_ALIVE
  ) {
    const pitPromise = this.getIndexName().then((index) =>
      this.esClient
        .openPointInTime({ index, keep_alive: keepAlive })
        .then(({ id }) => ({ id, keep_alive: keepAlive }))
    );

    let currentBatchSearch: Promise<SearchResponse<T>> | undefined;
    /* Returns the next batch of search results */
    const next = async (): Promise<Array<Stored<T>>> => {
      const pit = await pitPromise;
      if (!currentBatchSearch) {
        currentBatchSearch = this.esClient.search<T>({ ...search, pit });
      } else {
        currentBatchSearch = currentBatchSearch.then((previousResponse) => {
          if (previousResponse.hits.hits.length === 0) {
            return previousResponse;
          }
          const lastSort = previousResponse.hits.hits[previousResponse.hits.hits.length - 1].sort;
          return this.esClient.search<T>({ ...search, pit, search_after: lastSort });
        });
      }
      const response = await currentBatchSearch;
      return this.processResponseHits(response);
    };

    /** Returns all the search results */
    const all = async (): Promise<Array<Stored<T>>> => {
      const allResults: Array<Stored<T>> = [];
      let results = await next();
      while (results.length) {
        allResults.push(...results);
        results = await next();
      }
      return allResults;
    };

    return { next, all };
  }
}
