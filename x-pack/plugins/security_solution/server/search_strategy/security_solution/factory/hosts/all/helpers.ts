/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { set } from '@elastic/safer-lodash-set/fp';
import { get, has, head } from 'lodash/fp';
import { hostFieldsMap } from '../../../../../../common/ecs/ecs_fields';
import { HostsEdges } from '../../../../../../common/search_strategy/security_solution/hosts';

import { HostAggEsItem, HostBuckets, HostValue } from '../../../../../lib/hosts/types';
import { toStringArray } from '../../../../helpers/to_array';

export const HOSTS_FIELDS: readonly string[] = [
  '_id',
  'lastSeen',
  'host.id',
  'host.name',
  'host.os.name',
  'host.os.version',
];

export const formatHostEdgesData = (
  fields: readonly string[] = HOSTS_FIELDS,
  bucket: HostAggEsItem
): HostsEdges =>
  fields.reduce<HostsEdges>(
    (flattenedFields, fieldName) => {
      const hostId = get('key', bucket);
      flattenedFields.node._id = hostId || null;
      flattenedFields.cursor.value = hostId || '';
      const fieldValue = getHostFieldValue(fieldName, bucket);
      if (fieldValue != null) {
        return set(`node.${fieldName}`, toStringArray(fieldValue), flattenedFields);
      }
      return flattenedFields;
    },
    {
      node: {},
      cursor: {
        value: '',
        tiebreaker: null,
      },
    } as HostsEdges
  );

const getHostFieldValue = (fieldName: string, bucket: HostAggEsItem): string | string[] | null => {
  const aggField = hostFieldsMap[fieldName]
    ? hostFieldsMap[fieldName].replace(/\./g, '_')
    : fieldName.replace(/\./g, '_');
  if (
    [
      'host.ip',
      'host.mac',
      'cloud.instance.id',
      'cloud.machine.type',
      'cloud.provider',
      'cloud.region',
    ].includes(fieldName) &&
    has(aggField, bucket)
  ) {
    const data: HostBuckets = get(aggField, bucket);
    return data.buckets.map((obj) => obj.key);
  } else if (has(`${aggField}.buckets`, bucket)) {
    return getFirstItem(get(`${aggField}`, bucket));
  } else if (has(aggField, bucket)) {
    const valueObj: HostValue = get(aggField, bucket);
    return valueObj.value_as_string;
  } else if (['host.name', 'host.os.name', 'host.os.version'].includes(fieldName)) {
    switch (fieldName) {
      case 'host.name':
        return get('key', bucket) || null;
      case 'host.os.name':
        return get('os.hits.hits[0]._source.host.os.name', bucket) || null;
      case 'host.os.version':
        return get('os.hits.hits[0]._source.host.os.version', bucket) || null;
    }
  }
  return null;
};

const getFirstItem = (data: HostBuckets): string | null => {
  const firstItem = head(data.buckets);
  if (firstItem == null) {
    return null;
  }
  return firstItem.key;
};
