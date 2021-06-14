/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { estypes } from '@elastic/elasticsearch';
import { IIndexReader } from '../elasticsearch';
import { truthy } from '../utils/predicates';
import { IEventQuery } from './public_api';

export interface EventQueryParams {
  indexReader: IIndexReader;
  request: estypes.SearchRequest;
}

export class EventQuery<TEvent> implements IEventQuery<TEvent> {
  constructor(private readonly params: EventQueryParams) {}

  public async execute(): Promise<TEvent[]> {
    const { indexReader, request } = this.params;

    const response = await indexReader.search<TEvent>(request);
    return response.body.hits.hits.map((hit) => hit._source).filter(truthy);
  }
}
