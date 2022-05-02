/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get, isEmpty } from 'lodash/fp';
import { set } from '@elastic/safer-lodash-set/fp';

import { processFieldsMap, userFieldsMap } from '../../../../../../common/ecs/ecs_fields';
import {
  ProcessHits,
  HostsUncommonProcessesEdges,
  HostsUncommonProcessHit,
} from '../../../../../../common/search_strategy/security_solution/hosts/uncommon_processes';
import { toObjectArrayOfStrings } from '../../../../../../common/utils/to_array';
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

export interface UncommonProcessBucket {
  key: string;
  hosts: {
    buckets: Array<{ key: string; host: HostHits }>;
  };
  process: ProcessHits;
}

export const getHosts = (buckets: ReadonlyArray<{ key: string; host: HostHits }>) =>
  buckets.map((bucket) => {
    const fields = get('host.hits.hits[0].fields', bucket);
    return {
      id: [bucket.key],
      name: get('host.name', fields),
    };
  });

export const formatAuthenticationData = (
  hit: HostsUncommonProcessHit
): HostsUncommonProcessesEdges => {
  const instancesCount = typeof hit.total === 'number' ? hit.total : hit.total.value;

  let flattenedFields = {
    node: {
      _id: hit._id,
      instances: instancesCount,
      hosts: hit.host,
      process: {},
    },
    cursor: {
      value: hit.cursor,
      tiebreaker: null,
    },
  };

  const lastSuccessFields = getFlattenedFields(uncommonProcessesFields, hit, 'lastSuccess');
  if (Object.keys(lastSuccessFields).length > 0) {
    flattenedFields = set('node.lastSuccess', lastSuccessFields, flattenedFields);
  }

  const lastFailureFields = getFlattenedFields(uncommonProcessesFields, hit, 'lastFailure');
  if (Object.keys(lastFailureFields).length > 0) {
    flattenedFields = set('node.lastFailure', lastFailureFields, flattenedFields);
  }

  return flattenedFields;
};

const getFlattenedFields = (
  fields: string[],
  hit: HostsUncommonProcessHit,
  parentField: string
) => {
  return fields.reduce((flattenedFields, fieldName) => {
    const fieldPath = `${fieldName}`;
    const esField = get(`${parentField}['${fieldName}']`, {
      ...processFieldsMap,
      ...userFieldsMap,
    });

    if (!isEmpty(esField)) {
      const fieldValue = get(`${parentField}['${esField}']`, hit.fields);
      if (!isEmpty(fieldValue)) {
        return set(
          fieldPath,
          toObjectArrayOfStrings(fieldValue).map(({ str }) => str),
          flattenedFields
        );
      }
    }

    return flattenedFields;
  }, {});
};
