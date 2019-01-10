/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get, getOr, head, last } from 'lodash/fp';
import { HostsData, HostsEdges } from '../../graphql/types';
import { mergeFieldsWithHit } from '../../utils/build_query';
import { FrameworkAdapter, FrameworkRequest } from '../framework';
import { TermAggregation } from '../types';
import { buildQuery, hostsFieldsMap } from './query.dsl';
import { HostBucket, HostData, HostHit, HostsAdapter, HostsRequestOptions } from './types';

export class ElasticsearchHostsAdapter implements HostsAdapter {
  constructor(private readonly framework: FrameworkAdapter) {}

  public async getHosts(
    request: FrameworkRequest,
    options: HostsRequestOptions
  ): Promise<HostsData> {
    const response = await this.framework.callWithRequest<HostData, TermAggregation>(
      request,
      'search',
      buildQuery(options)
    );
    const { limit } = options.pagination;
    const totalCount = getOr(0, 'aggregations.host_count.value', response);
    const hits: HostHit[] = getOr([], 'aggregations.group_by_host.buckets', response).map(
      (bucket: HostBucket) => ({ ...head(bucket.host.hits.hits), cursor: bucket.key!.host_name })
    );
    const hostsEdges = hits.map(hit => formatHostsData(options.fields, hit, hostsFieldsMap));
    const hasNextPage = hostsEdges.length === limit + 1;
    const edges = hasNextPage ? hostsEdges.splice(0, limit) : hostsEdges;
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

export const formatHostsData = (
  fields: ReadonlyArray<string>,
  hit: HostHit,
  fieldMap: Readonly<Record<string, string>>
): HostsEdges =>
  fields.reduce(
    (flattenedFields, fieldName) => {
      flattenedFields.host._id = hit._id;
      if (hit.cursor) {
        flattenedFields.cursor.value = hit.cursor;
      }
      return mergeFieldsWithHit(fieldName, 'host', flattenedFields, fieldMap, hit) as HostsEdges;
    },
    {
      host: {},
      cursor: {
        value: '',
        tiebreaker: null,
      },
    } as HostsEdges
  );
