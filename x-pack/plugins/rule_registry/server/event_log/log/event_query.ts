/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { estypes } from '@elastic/elasticsearch';
import { set } from '@elastic/safer-lodash-set';
import { Logger } from 'kibana/server';
import { IIndexReader } from '../elasticsearch';
import { truthy } from '../utils/predicates';
import { IEventQuery } from './public_api';

export interface EventQueryParams {
  indexReader: IIndexReader;
  logger: Logger;
  baseRequest: estypes.SearchRequest;
}

export class EventQuery<TEvent> implements IEventQuery<TEvent> {
  private readonly indexReader: IIndexReader;
  private readonly baseRequest: estypes.SearchRequest;

  constructor(params: EventQueryParams) {
    this.indexReader = params.indexReader;
    this.baseRequest = params.baseRequest;
  }

  public async execute(): Promise<TEvent[]> {
    const response = await this.indexReader.search<TEvent>(this.baseRequest);
    return response.body.hits.hits.map((hit) => hit._source).filter(truthy);
  }

  public async search<TDocument = TEvent>(
    extraRequest: estypes.SearchRequest
  ): Promise<estypes.SearchResponse<TDocument>> {
    const finalRequest = mergeRequests(this.baseRequest, extraRequest);
    const response = await this.indexReader.search<TDocument>(finalRequest);
    return response.body;
  }
}

const mergeRequests = (
  base: estypes.SearchRequest,
  ext: estypes.SearchRequest
): estypes.SearchRequest => {
  const result: estypes.SearchRequest = {
    ...base,
    ...ext,
    body: {
      ...base.body,
      ...ext.body,
    },
  };

  const baseBool = base.body?.query?.bool;
  const extBool = ext.body?.query?.bool;

  if (baseBool != null || extBool != null) {
    const mergedBool: estypes.BoolQuery = {
      filter: mergeBoolClauses(baseBool?.filter, extBool?.filter),
      must: mergeBoolClauses(baseBool?.must, extBool?.must),
      must_not: mergeBoolClauses(baseBool?.must_not, extBool?.must_not),
      should: mergeBoolClauses(baseBool?.should, extBool?.should),
      minimum_should_match: extBool?.minimum_should_match ?? baseBool?.minimum_should_match,
      boost: extBool?.boost ?? baseBool?.boost,
      _name: extBool?._name ?? baseBool?._name,
    };

    set(result, 'body.query.bool', mergedBool);
  }

  return result;
};

type BoolQueryClause = estypes.QueryContainer | estypes.QueryContainer[] | undefined;

const mergeBoolClauses = (c1: BoolQueryClause, c2: BoolQueryClause): BoolQueryClause => {
  const queries = [...toArray(c1), ...toArray(c2)];
  return queries.length > 1 ? queries : queries.length === 1 ? queries[0] : undefined;
};

const toArray = <T>(x: T | T[] | null | undefined): T[] => {
  return Array.isArray(x) ? x : x != null ? [x] : [];
};
