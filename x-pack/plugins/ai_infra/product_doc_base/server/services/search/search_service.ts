/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { ElasticsearchClient } from '@kbn/core/server';
import { getIndicesForProductNames, mapResult } from './utils';
import { performSearch } from './perform_search';
import type { DocSearchOptions, DocSearchResponse } from './types';

export class SearchService {
  private readonly log: Logger;
  private readonly esClient: ElasticsearchClient;

  constructor({ logger, esClient }: { logger: Logger; esClient: ElasticsearchClient }) {
    this.log = logger;
    this.esClient = esClient;
  }

  async search(options: DocSearchOptions): Promise<DocSearchResponse> {
    const { query, max = 3, products } = options;
    this.log.debug(`performing search - query=[${query}]`);
    const results = await performSearch({
      searchQuery: query,
      size: max,
      index: getIndicesForProductNames(products),
      client: this.esClient,
    });

    return {
      results: results.map(mapResult),
    };
  }
}
