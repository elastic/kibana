/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get, getOr } from 'lodash/fp';

import { UncommonProcessesData, UncommonProcessesEdges } from '../../graphql/types';
import { mergeFieldsWithHit, inspectStringifyObject } from '../../utils/build_query';
import { processFieldsMap, userFieldsMap } from '../ecs_fields';
import { FrameworkAdapter, FrameworkRequest, RequestOptionsPaginated } from '../framework';
import { HostHits, TermAggregation } from '../types';
import { DEFAULT_MAX_TABLE_QUERY_SIZE } from '../../../common/constants';
import { buildQuery } from './query.dsl';
import {
  UncommonProcessBucket,
  UncommonProcessData,
  UncommonProcessesAdapter,
  UncommonProcessHit,
} from './types';

export class ElasticsearchUncommonProcessesAdapter implements UncommonProcessesAdapter {
  constructor(private readonly framework: FrameworkAdapter) {}

  public async getUncommonProcesses(
    request: FrameworkRequest,
    options: RequestOptionsPaginated
  ): Promise<UncommonProcessesData> {
    if (options.pagination && options.pagination.querySize >= DEFAULT_MAX_TABLE_QUERY_SIZE) {
      throw new Error(`No query size above ${DEFAULT_MAX_TABLE_QUERY_SIZE}`);
    }
    const dsl = buildQuery(options);
    const response = await this.framework.callWithRequest<UncommonProcessData, TermAggregation>(
      request,
      'search',
      dsl
    );
    const { activePage, cursorStart, fakePossibleCount, querySize } = options.pagination;
    const totalCount = getOr(0, 'aggregations.process_count.value', response);
    const buckets = getOr([], 'aggregations.group_by_process.buckets', response);
    const hits = getHits(buckets);

    const uncommonProcessesEdges = hits.map((hit) =>
      formatUncommonProcessesData(options.fields, hit, { ...processFieldsMap, ...userFieldsMap })
    );

    const fakeTotalCount = fakePossibleCount <= totalCount ? fakePossibleCount : totalCount;
    const edges = uncommonProcessesEdges.splice(cursorStart, querySize - cursorStart);
    const inspect = {
      dsl: [inspectStringifyObject(dsl)],
      response: [inspectStringifyObject(response)],
    };

    const showMorePagesIndicator = totalCount > fakeTotalCount;
    return {
      edges,
      inspect,
      pageInfo: {
        activePage: activePage ? activePage : 0,
        fakeTotalCount,
        showMorePagesIndicator,
      },
      totalCount,
    };
  }
}

export const getHits = (buckets: readonly UncommonProcessBucket[]): readonly UncommonProcessHit[] =>
  buckets.map((bucket: Readonly<UncommonProcessBucket>) => ({
    _id: bucket.process.hits.hits[0]._id,
    _index: bucket.process.hits.hits[0]._index,
    _type: bucket.process.hits.hits[0]._type,
    _score: bucket.process.hits.hits[0]._score,
    _source: bucket.process.hits.hits[0]._source,
    sort: bucket.process.hits.hits[0].sort,
    cursor: bucket.process.hits.hits[0].cursor,
    total: bucket.process.hits.total,
    host: getHosts(bucket.hosts.buckets),
  }));

export const getHosts = (buckets: ReadonlyArray<{ key: string; host: HostHits }>) =>
  buckets.map((bucket) => {
    const source = get('host.hits.hits[0]._source', bucket);
    return {
      id: [bucket.key],
      name: get('host.name', source),
    };
  });

export const formatUncommonProcessesData = (
  fields: readonly string[],
  hit: UncommonProcessHit,
  fieldMap: Readonly<Record<string, string>>
): UncommonProcessesEdges =>
  fields.reduce<UncommonProcessesEdges>(
    (flattenedFields, fieldName) => {
      flattenedFields.node._id = hit._id;
      flattenedFields.node.instances = getOr(0, 'total.value', hit);
      flattenedFields.node.hosts = hit.host;
      if (hit.cursor) {
        flattenedFields.cursor.value = hit.cursor;
      }
      return mergeFieldsWithHit(fieldName, flattenedFields, fieldMap, hit);
    },
    {
      node: {
        _id: '',
        instances: 0,
        process: {},
        hosts: [],
      },
      cursor: {
        value: '',
        tiebreaker: null,
      },
    }
  );
