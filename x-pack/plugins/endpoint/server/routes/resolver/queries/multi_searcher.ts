/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
/* eslint-disable max-classes-per-file */

import { IScopedClusterClient } from 'kibana/server';
import { MSearchResponse, SearchResponse } from 'elasticsearch';
import { ResolverEvent } from '../../../../common/types';
import { JsonObject } from '../../../../../../../src/plugins/kibana_utils/public';
import { EventsQuery } from './events';
import { ChildrenQuery } from './children';
import { TotalsResult } from './totals_aggs';

export interface MSearchQuery {
  buildMSearch(ids: string | string[]): JsonObject[];
}

export interface QueryInfo {
  query: MSearchQuery;
  ids: string | string[];
}

export class MultiSearcher {
  private queries: QueryInfo[] = [];
  constructor(private readonly client: IScopedClusterClient) {}

  add(newQueries: QueryInfo[]) {
    this.queries = [...this.queries, ...newQueries];
  }

  async search() {
    let searchQuery: JsonObject[] = [];
    this.queries.forEach(
      info => (searchQuery = [...searchQuery, ...info.query.buildMSearch(info.ids)])
    );
    return await this.client.callAsCurrentUser('msearch', {
      body: searchQuery,
    });
  }
}
