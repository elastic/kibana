/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
/* eslint-disable max-classes-per-file */

import { IScopedClusterClient } from 'kibana/server';
import { MSearchResponse } from 'elasticsearch';
import { ResolverEvent } from '../../../../common/types';
import { JsonObject } from '../../../../../../../src/plugins/kibana_utils/public';

export interface MSearchQuery {
  buildMSearch(ids: string | string[]): JsonObject[];
}

export interface QueryInfo {
  query: MSearchQuery;
  ids: string | string[];
}

export class MultiSearcher {
  constructor(private readonly client: IScopedClusterClient) {}

  async search(queries: QueryInfo[]) {
    if (queries.length === 0) {
      throw new Error('No queries provided to MultiSearcher');
    }

    let searchQuery: JsonObject[] = [];
    queries.forEach(info => (searchQuery = [...searchQuery, ...info.query.buildMSearch(info.ids)]));
    const res: MSearchResponse<ResolverEvent> = await this.client.callAsCurrentUser('msearch', {
      body: searchQuery,
    });

    if (!res.responses) {
      throw new Error('No response from Elasticsearch');
    }

    if (res.responses.length !== queries.length) {
      throw new Error(`Responses length was: ${res.responses.length} expected ${queries.length}`);
    }
    return res.responses;
  }
}
