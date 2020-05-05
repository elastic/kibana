/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IScopedClusterClient } from 'kibana/server';
import { ResolverEvent } from '../../../../common/types';
import { Searcher } from './searcher';
import { Query } from './base';

export class MultiSearcher {
  constructor(
    private readonly client: IScopedClusterClient,
    private readonly query: Query[],
    private readonly ids: string | string[]
  ) {}

  async search() {
    const res = await this.client.callAsCurrentUser('msearch', this.query.build(this.ids));
    return this.query.formatResults(res);
  }
}
