/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getOr } from 'lodash/fp';
import { UncommonProcessesData, UncommonProcessesEdges } from '../../graphql/types';
import { mergeFieldsWithHit } from '../../utils/build_query';
import { FrameworkAdapter, FrameworkRequest } from '../framework';
import { HostHits, TermAggregation } from '../types';
import { buildQuery, processFieldsMap } from './query.dsl';
import {
  UncommonProcessBucket,
  UncommonProcessData,
  UncommonProcessesAdapter,
  UncommonProcessesRequestOptions,
  UncommonProcessHit,
} from './types';

export class ElasticsearchUncommonProcessesAdapter implements UncommonProcessesAdapter {
  constructor(private readonly framework: FrameworkAdapter) {}

  public async getUncommonProcesses(
    request: FrameworkRequest,
    options: UncommonProcessesRequestOptions
  ): Promise<UncommonProcessesData> {
    const response = await this.framework.callWithRequest<UncommonProcessData, TermAggregation>(
      request,
      'search',
      buildQuery(options)
    );

    const { limit } = options.pagination;
    const totalCount = getOr(0, 'aggregations.process_count.value', response);
    const buckets = getOr([], 'aggregations.group_by_process.buckets', response);
    const hits = getHits(buckets);

    const uncommonProcessesEdges = hits.map(hit =>
      formatUncommonProcessesData(options.fields, hit, processFieldsMap)
    );
    const edges = uncommonProcessesEdges.splice(0, limit);
    return {
      edges,
      totalCount,
      pageInfo: {
        hasNextPage: null,
        endCursor: { value: '' },
      },
    };
  }
}

export const getHits = (
  buckets: ReadonlyArray<UncommonProcessBucket>
): ReadonlyArray<UncommonProcessHit> =>
  buckets.map((bucket: Readonly<UncommonProcessBucket>) => ({
    _id: bucket.process.hits.hits[0]._id,
    _index: bucket.process.hits.hits[0]._index,
    _type: bucket.process.hits.hits[0]._type,
    _score: bucket.process.hits.hits[0]._score,
    _source: bucket.process.hits.hits[0]._source,
    sort: bucket.process.hits.hits[0].sort,
    cursor: bucket.process.hits.hits[0].cursor,
    total: bucket.process.hits.total,
    hosts: getHosts(bucket.hosts.buckets),
  }));

export const getHosts = (buckets: ReadonlyArray<{ key: string; host: HostHits }>) =>
  buckets.map(bucket => ({
    id: bucket.key,
    name: bucket.host.hits.hits[0]._source.host.name,
  }));

export const formatUncommonProcessesData = (
  fields: ReadonlyArray<string>,
  hit: UncommonProcessHit,
  fieldMap: Readonly<Record<string, string>>
): UncommonProcessesEdges =>
  fields.reduce(
    (flattenedFields, fieldName) => {
      flattenedFields.uncommonProcess._id = hit._id;
      flattenedFields.uncommonProcess.instances = getOr(0, 'total.value', hit);
      flattenedFields.uncommonProcess.hosts = hit.hosts;
      if (hit.cursor) {
        flattenedFields.cursor.value = hit.cursor;
      }
      return mergeFieldsWithHit(
        fieldName,
        'uncommonProcess',
        flattenedFields,
        fieldMap,
        hit
      ) as UncommonProcessesEdges;
    },
    {
      uncommonProcess: {},
      cursor: {
        value: '',
        tiebreaker: null,
      },
    } as UncommonProcessesEdges
  );
