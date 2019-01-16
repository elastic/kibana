/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get, getOr, head, last } from 'lodash/fp';

import { AuthorizationsData, AuthorizationsEdges } from '../../graphql/types';
import { mergeFieldsWithHit } from '../../utils/build_query';
import { FrameworkAdapter, FrameworkRequest } from '../framework';
import { TermAggregation } from '../types';
import { auditdFieldsMap, buildQuery } from './query.dsl';
import {
  AuthorizationBucket,
  AuthorizationData,
  AuthorizationHit,
  AuthorizationsAdapter,
  AuthorizationsRequestOptions,
} from './types';

export class ElasticsearchAuthorizationAdapter implements AuthorizationsAdapter {
  constructor(private readonly framework: FrameworkAdapter) {}

  public async getAuthorizations(
    request: FrameworkRequest,
    options: AuthorizationsRequestOptions
  ): Promise<AuthorizationsData> {
    const response = await this.framework.callWithRequest<AuthorizationData, TermAggregation>(
      request,
      'search',
      buildQuery(options)
    );
    const { limit } = options.pagination;
    const totalCount = getOr(0, 'aggregations.user_count.value', response);

    const hits: AuthorizationHit[] = getOr([], 'aggregations.group_by_users.buckets', response).map(
      (bucket: AuthorizationBucket) => ({
        ...head(bucket.authorization.hits.hits),
        user: bucket.key.user_uid,
        cursor: bucket.key.user_uid,
        failures: bucket.failures.doc_count,
        successes: bucket.successes.doc_count,
      })
    );

    const authorizationEdges: AuthorizationsEdges[] = hits.map(hit =>
      formatAuthorizationData(options.fields, hit, auditdFieldsMap)
    );

    const hasNextPage = authorizationEdges.length === limit + 1;
    const edges = hasNextPage ? authorizationEdges.splice(0, limit) : authorizationEdges;
    const lastCursor = get('cursor', last(edges));
    return {
      edges,
      totalCount,
      pageInfo: {
        hasNextPage,
        endCursor: lastCursor,
      },
    };
  }
}

export const formatAuthorizationData = (
  fields: ReadonlyArray<string>,
  hit: AuthorizationHit,
  fieldMap: Readonly<Record<string, string>>
): AuthorizationsEdges => {
  const init: AuthorizationsEdges = {
    node: {
      failures: 0,
      successes: 0,
      _id: '',
      user: {
        name: '',
      },
      source: { ip: '' },
      latest: '',
      host: {
        id: '',
        name: '',
      },
    },
    cursor: {
      value: '',
      tiebreaker: null,
    },
  };
  return fields.reduce((flattenedFields, fieldName) => {
    if (hit.cursor) {
      flattenedFields.cursor.value = hit.cursor;
    }
    flattenedFields.node = {
      ...flattenedFields.node,
      ...{
        _id: hit._id,
        user: { name: hit.user },
        failures: hit.failures,
        successes: hit.successes,
      },
    };
    return mergeFieldsWithHit(fieldName, 'node', flattenedFields, fieldMap, hit);
  }, init);
};
