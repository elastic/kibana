/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get, getOr, head, last } from 'lodash/fp';

import { AuthenticationsData, AuthenticationsEdges } from '../../graphql/types';
import { mergeFieldsWithHit } from '../../utils/build_query';
import { FrameworkAdapter, FrameworkRequest } from '../framework';
import { TermAggregation } from '../types';
import { auditdFieldsMap, buildQuery } from './query.dsl';
import {
  AuthenticationBucket,
  AuthenticationData,
  AuthenticationHit,
  AuthenticationsAdapter,
  AuthenticationsRequestOptions,
} from './types';

export class ElasticsearchAuthenticationAdapter implements AuthenticationsAdapter {
  constructor(private readonly framework: FrameworkAdapter) {}

  public async getAuthentications(
    request: FrameworkRequest,
    options: AuthenticationsRequestOptions
  ): Promise<AuthenticationsData> {
    const response = await this.framework.callWithRequest<AuthenticationData, TermAggregation>(
      request,
      'search',
      buildQuery(options)
    );
    const { limit } = options.pagination;
    const totalCount = getOr(0, 'aggregations.user_count.value', response);

    const hits: AuthenticationHit[] = getOr(
      [],
      'aggregations.group_by_users.buckets',
      response
    ).map((bucket: AuthenticationBucket) => ({
      ...head(bucket.authentication.hits.hits),
      user: bucket.key.user_uid,
      cursor: bucket.key.user_uid,
      failures: bucket.failures.doc_count,
      successes: bucket.successes.doc_count,
    }));

    const authenticationEdges: AuthenticationsEdges[] = hits.map(hit =>
      formatAuthenticationData(options.fields, hit, auditdFieldsMap)
    );

    const hasNextPage = authenticationEdges.length === limit + 1;
    const edges = hasNextPage ? authenticationEdges.splice(0, limit) : authenticationEdges;
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

export const formatAuthenticationData = (
  fields: ReadonlyArray<string>,
  hit: AuthenticationHit,
  fieldMap: Readonly<Record<string, string>>
): AuthenticationsEdges => {
  const init: AuthenticationsEdges = {
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
    return mergeFieldsWithHit(fieldName, flattenedFields, fieldMap, hit);
  }, init);
};
