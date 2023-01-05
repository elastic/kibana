/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash/fp';
import { set } from '@kbn/safer-lodash-set/fp';

import type {
  ProcessHits,
  HostsUncommonProcessesEdges,
  HostsUncommonProcessHit,
} from '../../../../../../common/search_strategy/security_solution/hosts/uncommon_processes';
import type { HostHits } from '../../../../../../common/search_strategy';
import { getFlattenedFields } from '../../../../helpers/get_flattened_fields';

export const UNCOMMON_PROCESSES_FIELDS = [
  '_id',
  'instances',
  'process.args',
  'process.name',
  'user.id',
  'user.name',
  'host.name',
];

export const getHits = (
  buckets: readonly UncommonProcessBucket[]
): readonly HostsUncommonProcessHit[] =>
  buckets.map((bucket: Readonly<UncommonProcessBucket>) => ({
    _id: bucket.process.hits.hits[0]._id,
    _index: bucket.process.hits.hits[0]._index,
    _type: bucket.process.hits.hits[0]._type,
    _score: bucket.process.hits.hits[0]._score,
    fields: bucket.process.hits.hits[0].fields,
    sort: bucket.process.hits.hits[0].sort,
    cursor: bucket.process.hits.hits[0].cursor,
    total: bucket.process.hits.total,
    host: getHosts(bucket.hosts.buckets),
  }));

export const getHosts = (buckets: ReadonlyArray<{ key: string; host: HostHits }>) =>
  buckets.map((bucket) => {
    const fields = get('host.hits.hits[0].fields', bucket);
    return {
      id: [bucket.key],
      name: get('host.name', fields),
    };
  });

export interface UncommonProcessBucket {
  key: string;
  hosts: {
    buckets: Array<{ key: string; host: HostHits }>;
  };
  process: ProcessHits;
}

export const formatUncommonProcessesData = (
  hit: HostsUncommonProcessHit,
  fieldMap: Readonly<Record<string, string>>
): HostsUncommonProcessesEdges => {
  let flattenedFields = {
    node: {
      _id: '',
      instances: 0,
      process: {},
      hosts: [{}],
    },
    cursor: {
      value: '',
      tiebreaker: null,
    },
  };
  const instancesCount = typeof hit.total === 'number' ? hit.total : hit.total.value;
  const processFlattenedFields = getFlattenedFields(
    UNCOMMON_PROCESSES_FIELDS,
    hit.fields,
    fieldMap
  );

  if (Object.keys(processFlattenedFields).length > 0) {
    flattenedFields = set('node', processFlattenedFields, flattenedFields);
  }
  flattenedFields.node._id = hit._id;
  flattenedFields.node.instances = instancesCount;
  flattenedFields.node.hosts = hit.host;
  if (hit.cursor) {
    flattenedFields.cursor.value = hit.cursor;
  }
  return flattenedFields;
};
