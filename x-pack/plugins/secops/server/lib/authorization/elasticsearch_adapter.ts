/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getOr, head, isEmpty } from 'lodash/fp';
import { AuthorizationsData, AuthorizationsEdges } from '../../graphql/types';
// import { mergeFieldsWithHit } from '../../utils/build_query';
import { FrameworkAdapter, FrameworkRequest } from '../framework';
import { TermAggregation } from '../types';
import { buildQuery } from './query.dsl';
import { AuthorizationData, AuthorizationsAdapter, AuthorizationsRequestOptions } from './types';

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
    console.log('----> response', JSON.stringify(response, null, 2));

    const { limit } = options.pagination;
    console.log('-----> response limit', limit);
    const totalCount = getOr(0, 'aggregations.user_count.value', response);
    // tslint:disable-next-line:no-any
    const buckets = getOr([], 'aggregations.users.buckets', response);
    // console.log('---> hits are:', JSON.stringify(hits, null, 2));

    // tslint:disable-next-line:no-any
    const edges: AuthorizationsEdges[] = buckets.map((bucket: any) => {
      console.log('The current bucket is:', JSON.stringify(bucket, null, 2));
      const failures = getFailures(bucket.login_result.buckets);
      const successes = getSuccesses(bucket.login_result.buckets);
      const { latest, from } = getLatestFrom(bucket.login_result.buckets);
      return {
        authorization: {
          _id: bucket.key,
          user: bucket.key,
          failures,
          successes,
          latest,
          from,
        },
        cursor: {
          value: '',
          tiebreaker: null,
        },
      } as AuthorizationsEdges;
    });
    // const buckets = getOr([], 'aggregations.group_by_auditd.buckets', response);

    // console.log('-----> response total count', totalCount);
    // console.log('-----> buckets', JSON.stringify(buckets, null, 2));
    /*
    const buckets = getOr([], 'aggregations.group_by_process.buckets', response);
    const hits = getHits(buckets);
    const uncommonProcessesEdges = hits.map(hit =>
      formatUncommonProcessesData(options.fields, hit, processFieldsMap)
    );
    */
    // TODO: Is this doing anyting?
    // const lastCursor = get('cursor', edges.slice(-1)[0]);

    /*
    const edges: AuthorizationsEdges[] = [
      {
        authorization: {
          _id: '123',
          failures: 0,
          successes: 0,
          user: 'some user',
          latest: 'some date',
          from: 'some date',
        },
        cursor: {
          value: '',
          tiebreaker: null,
        },
      },
    ]; // uncommonProcessesEdges.splice(0, limit);
    */
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

export const getFailureBucket = (buckets: []) => getBucketFromKey(buckets, 'fail');
export const getSuccessBucket = (buckets: []) => getBucketFromKey(buckets, 'success');

export const getBucketFromKey = (buckets: [], key: string) => {
  const bucketFound = buckets.filter((bucket: any) => bucket.key === key);
  if (isEmpty(bucketFound)) {
    return null;
  } else {
    return bucketFound[0];
  }
};

export const getFailures = (buckets: []): number => {
  const failure = getFailureBucket(buckets);
  return getOr(0, 'success_failure.hits.total.value', failure);
};

export const getSuccesses = (buckets: []) => {
  const success = getSuccessBucket(buckets);
  return getOr(0, 'success_failure.hits.total.value', success);
};

// tslint:disable-next-line:no-any
export const getLatestFrom = (buckets: []): { latest: string; from: string | null } => {
  console.log('latest hit is:', JSON.stringify(buckets, null, 2));
  const successBucket = getSuccessBucket(buckets);
  const failureBucket = getFailureBucket(buckets);
  console.log('failure bucket:', JSON.stringify(getFailureBucket(buckets), null, 2));
  console.log('success bucket:', JSON.stringify(getSuccessBucket(buckets), null, 2));
  // TODO: Can't we just order this in the query?
  const successDateValue = new Date(
    getOr(
      '1970-01-01T00:00:00.000Z',
      'success_failure.hits.hits[0]._source.@timestamp',
      successBucket
    )
  );
  const successIp = getOr(null, 'success_failure.hits.hits[0]_source.source.ip', successBucket);
  const failureDateValue = new Date(
    getOr(
      '1970-01-01T00:00:00.000Z',
      'success_failure.hits.hits[0]._source.@timestamp',
      failureBucket
    )
  );
  const failureIp = getOr(null, 'success_failure.hits.hits[0]_source.source.ip', failureBucket);
  if (successDateValue > failureDateValue) {
    return { latest: successDateValue.toISOString(), from: successIp };
  } else {
    return { latest: failureDateValue.toISOString(), from: failureIp };
  }
};

/*
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
*/
