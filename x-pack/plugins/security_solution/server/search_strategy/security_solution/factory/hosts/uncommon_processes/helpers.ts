/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { get, getOr } from 'lodash/fp';
import { set } from '@elastic/safer-lodash-set/fp';

import { mergeFieldsWithHit } from '../../../../../utils/build_query';
import {
  ProcessHits,
  UncommonProcessesEdges,
  UncommonProcessHit,
} from '../../../../../../common/search_strategy/security_solution/hosts/uncommon_processes';
import { toArray } from '../../../../helpers/to_array';
import { HostHits } from '../../../../../../common/search_strategy';

export const uncommonProcessesFields = [
  '_id',
  'instances',
  'process.args',
  'process.name',
  'user.id',
  'user.name',
  'hosts.name',
];

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

export interface UncommonProcessBucket {
  key: string;
  hosts: {
    buckets: Array<{ key: string; host: HostHits }>;
  };
  process: ProcessHits;
}

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

      const mergedResult = mergeFieldsWithHit(fieldName, flattenedFields, fieldMap, hit);
      let fieldPath = `node.${fieldName}`;
      let fieldValue = get(fieldPath, mergedResult);
      if (fieldPath === 'node.hosts.name') {
        fieldPath = `node.hosts.0.name`;
        fieldValue = get(fieldPath, mergedResult);
      }
      return set(fieldPath, toArray(fieldValue), mergedResult);
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
