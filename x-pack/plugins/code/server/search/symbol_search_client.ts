/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DetailSymbolInformation } from '@elastic/lsp-extension';

import { SymbolSearchRequest, SymbolSearchResult } from '../../model';
import { SymbolIndexNamePrefix, SymbolSearchIndexWithScope } from '../indexer/schema';
import { EsClient } from '../lib/esqueue';
import { Logger } from '../log';
import { AbstractSearchClient } from './abstract_search_client';

export class SymbolSearchClient extends AbstractSearchClient {
  constructor(protected readonly client: EsClient, protected readonly log: Logger) {
    super(client, log);
  }

  public async findByQname(qname: string): Promise<SymbolSearchResult> {
    const [from, size] = [0, 1];
    const rawRes = await this.client.search({
      index: `${SymbolIndexNamePrefix}*`,
      body: {
        from,
        size,
        query: {
          term: {
            qname,
          },
        },
      },
    });
    return this.handleResults(rawRes);
  }

  public async suggest(req: SymbolSearchRequest): Promise<SymbolSearchResult> {
    const resultsPerPage = this.getResultsPerPage(req);
    const from = (req.page - 1) * resultsPerPage;
    const size = resultsPerPage;

    const index = req.repoScope
      ? SymbolSearchIndexWithScope(req.repoScope)
      : `${SymbolIndexNamePrefix}*`;

    const rawRes = await this.client.search({
      index,
      body: {
        from,
        size,
        query: {
          bool: {
            should: [
              // Boost more for case sensitive prefix query.
              {
                prefix: {
                  qname: {
                    value: req.query,
                    boost: 2.0,
                  },
                },
              },
              // Boost less for lowercased prefix query.
              {
                prefix: {
                  'qname.lowercased': {
                    // prefix query does not apply analyzer for query. so manually lowercase the query in here.
                    value: req.query.toLowerCase(),
                    boost: 1.0,
                  },
                },
              },
              // Boost the exact match with case sensitive query the most.
              {
                term: {
                  qname: {
                    value: req.query,
                    boost: 20.0,
                  },
                },
              },
              {
                term: {
                  'qname.lowercased': {
                    // term query does not apply analyzer for query either. so manually lowercase the query in here.
                    value: req.query.toLowerCase(),
                    boost: 10.0,
                  },
                },
              },
              // The same applies for `symbolInformation.name` feild.
              {
                prefix: {
                  'symbolInformation.name': {
                    value: req.query,
                    boost: 2.0,
                  },
                },
              },
              {
                prefix: {
                  'symbolInformation.name.lowercased': {
                    value: req.query.toLowerCase(),
                    boost: 1.0,
                  },
                },
              },
              {
                term: {
                  'symbolInformation.name': {
                    value: req.query,
                    boost: 20.0,
                  },
                },
              },
              {
                term: {
                  'symbolInformation.name.lowercased': {
                    value: req.query.toLowerCase(),
                    boost: 10.0,
                  },
                },
              },
            ],
            disable_coord: false,
            adjust_pure_negative: true,
            boost: 1.0,
          },
        },
      },
    });

    return this.handleResults(rawRes);
  }

  private handleResults(rawRes: any) {
    const hits: any[] = rawRes.hits.hits;
    const symbols: DetailSymbolInformation[] = hits.map(hit => {
      const symbol: DetailSymbolInformation = hit._source;
      return symbol;
    });
    const result: SymbolSearchResult = {
      symbols,
      took: rawRes.took,
      total: rawRes.hits.total.value,
    };
    return result;
  }
}
