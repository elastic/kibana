/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getOr } from 'lodash/fp';

import { AuthenticationsData, AuthenticationsEdges } from '../../graphql/types';
import { mergeFieldsWithHit } from '../../utils/build_query';
import { FrameworkAdapter, FrameworkRequest, RequestOptions } from '../framework';
import { TermAggregation } from '../types';

import { auditdFieldsMap, buildQuery } from './query.dsl';
import {
  AuthenticationBucket,
  AuthenticationData,
  AuthenticationHit,
  AuthenticationsAdapter,
} from './types';

export class ElasticsearchAuthenticationAdapter implements AuthenticationsAdapter {
  constructor(private readonly framework: FrameworkAdapter) {}

  public async getAuthentications(
    request: FrameworkRequest,
    options: RequestOptions
  ): Promise<AuthenticationsData> {
    const response = await this.framework.callWithRequest<AuthenticationData, TermAggregation>(
      request,
      'search',
      buildQuery(options)
    );
    const { cursor, limit } = options.pagination;
    const totalCount = getOr(0, 'aggregations.user_count.value', response);
    const hits: AuthenticationHit[] = getOr(
      [],
      'aggregations.group_by_users.buckets',
      response
    ).map((bucket: AuthenticationBucket) => ({
      _id: bucket.authentication.hits.hits[0]._id,
      _source: {
        lastSuccess: getOr(null, 'successes.lastSuccess.hits.hits[0]._source', bucket),
        lastFailure: getOr(null, 'failures.lastFailure.hits.hits[0]._source', bucket),
      },
      user: bucket.key,
      cursor: bucket.key.user_uid,
      failures: bucket.failures.doc_count,
      successes: bucket.successes.doc_count,
    }));

    const authenticationEdges: AuthenticationsEdges[] = hits.map(hit =>
      formatAuthenticationData(options.fields, hit, auditdFieldsMap)
    );

    const hasNextPage = authenticationEdges.length === limit + 1;
    const beginning = cursor != null ? parseInt(cursor!, 10) : 0;
    const edges = authenticationEdges.splice(beginning, limit - beginning);
    return {
      edges,
      totalCount,
      pageInfo: {
        hasNextPage,
        endCursor: {
          value: String(limit),
          tiebreaker: null,
        },
      },
    };
  }
}

export const formatAuthenticationData = (
  fields: ReadonlyArray<string>,
  hit: AuthenticationHit,
  fieldMap: Readonly<Record<string, string>>
): AuthenticationsEdges =>
  fields.reduce<AuthenticationsEdges>(
    (flattenedFields, fieldName) => {
      if (hit.cursor) {
        flattenedFields.cursor.value = hit.cursor;
      }
      flattenedFields.node = {
        ...flattenedFields.node,
        ...{
          _id: hit._id,
          user: { name: [hit.user] },
          failures: hit.failures,
          successes: hit.successes,
        },
      };
      return mergeFieldsWithHit(fieldName, flattenedFields, fieldMap, hit);
    },
    {
      node: {
        failures: 0,
        successes: 0,
        _id: '',
        user: {
          name: [''],
        },
      },
      cursor: {
        value: '',
        tiebreaker: null,
      },
    }
  );
