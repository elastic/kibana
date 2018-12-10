/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get, getOr, has, head } from 'lodash/fp';
import { HostsData, HostsEdges } from '../../../common/graphql/types';
import { FrameworkAdapter, FrameworkRequest } from '../framework';
import { TermAggregation } from '../types';
import { buildQuery, HostsFieldsMap } from './query.dsl';
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
    const hits = getOr([], 'aggregations.group_by_host.buckets', response).map(
      (bucket: HostBucket) => ({ ...head(bucket.host.hits.hits), cursor: bucket.key.host_name })
    );
    const hostsEdges = hits.map(formatHostsData(options.fields)) as [HostsEdges];
    const hasNextPage = (hostsEdges.length as number) === limit + 1;
    const edges = hasNextPage ? hostsEdges.splice(0, limit) : hostsEdges;
    const lastCursor = get('cursor', edges.slice(-1)[0]);
    return {
      edges,
      totalCount,
      pageInfo: {
        hasNextPage,
        endCursor: lastCursor,
      },
    } as HostsData;
  }
}

const formatHostsData = (fields: string[]) => (hit: HostHit) =>
  fields.reduce(
    (flattenedFields, fieldName) => {
      if (hit.cursor) {
        flattenedFields.cursor.value = hit.cursor;
      }
      flattenedFields.host._id = get('_id', hit);
      if (HostsFieldsMap.hasOwnProperty(fieldName)) {
        const esField = Object.getOwnPropertyDescriptor(HostsFieldsMap, fieldName);
        return has(esField && esField.value, hit._source)
          ? {
              ...flattenedFields,
              host: {
                ...flattenedFields.host,
                ...fieldName
                  .split('.')
                  .reduceRight(
                    (obj, next) => ({ [next]: obj }),
                    get(esField && esField.value, hit._source)
                  ),
              },
            }
          : flattenedFields;
      }
      return flattenedFields;
    },
    {
      host: {} as { [fieldName: string]: string | number | boolean | null },
      cursor: {
        value: '',
        tiebreaker: null,
      },
    } as HostsEdges
  );
