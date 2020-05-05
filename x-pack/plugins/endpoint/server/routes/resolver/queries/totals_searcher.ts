/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SearchResponse } from 'elasticsearch';
import { IScopedClusterClient } from 'kibana/server';
import { ResolverEvent } from '../../../../common/types';
import { Searcher } from './searcher';
import { ResolverQuery } from './base';
import { TotalsResult } from './totals_aggs';

export class TotalsSearcher implements Searcher<TotalsResult> {
  constructor(
    private readonly client: IScopedClusterClient,
    private readonly query: ResolverQuery<TotalsResult>,
    private readonly ids: string | string[]
  ) {}

  async search(): Promise<TotalsResult> {
    const res: SearchResponse<ResolverEvent> = await this.client.callAsCurrentUser(
      'search',
      this.query.build(this.ids)
    );
    return this.query.formatResults(res);
  }
}
