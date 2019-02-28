/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getOr, head } from 'lodash/fp';

import { HostsData, HostsEdges } from '../../graphql/types';
import { mergeFieldsWithHit } from '../../utils/build_query';
import { FrameworkAdapter, FrameworkRequest, RequestOptions } from '../framework';
import { TermAggregation } from '../types';

import { buildQuery, hostsFieldsMap } from './query.dsl';
import { HostBucket, HostData, HostHit, HostsAdapter } from './types';

export class ElasticsearchHostsAdapter implements HostsAdapter {
  constructor(private readonly framework: FrameworkAdapter) {}

  public async getHosts(request: FrameworkRequest, options: RequestOptions): Promise<HostsData> {
    const response = await this.framework.callWithRequest<HostData, TermAggregation>(
      request,
      'search',
      buildQuery(options)
    );
    const { cursor, limit } = options.pagination;
    const totalCount = getOr(0, 'aggregations.host_count.value', response);
    const hits: HostHit[] = getOr([], 'aggregations.group_by_host.buckets', response).map(
      (bucket: HostBucket) => ({
        ...head(bucket.host.hits.hits),
        cursor: bucket.key!.host_name,
        firstSeen: bucket.firstSeen.value_as_string,
      })
    );
    const hostsEdges = hits.map(hit => formatHostsData(options.fields, hit, hostsFieldsMap));
    const hasNextPage = hostsEdges.length === limit + 1;
    const beginning = cursor != null ? parseInt(cursor, 10) : 0;
    const edges = hostsEdges.splice(beginning, limit - beginning);

    return {
      edges,
      totalCount,
      pageInfo: {
        hasNextPage,
        endCursor: {
          value: String(limit),
        },
      },
    };
  }
}

export const formatHostsData = (
  fields: ReadonlyArray<string>,
  hit: HostHit,
  fieldMap: Readonly<Record<string, string>>
): HostsEdges =>
  fields.reduce<HostsEdges>(
    (flattenedFields, fieldName) => {
      flattenedFields.node._id = hit._id;
      if (hit.cursor) {
        flattenedFields.cursor.value = hit.cursor;
      }
      if (hit.firstSeen) {
        flattenedFields.node.firstSeen = hit.firstSeen;
      }
      return mergeFieldsWithHit(fieldName, flattenedFields, fieldMap, hit);
    },
    {
      node: {},
      cursor: {
        value: '',
        tiebreaker: null,
      },
    }
  );
