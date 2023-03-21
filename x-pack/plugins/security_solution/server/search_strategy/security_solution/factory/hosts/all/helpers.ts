/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { set } from '@kbn/safer-lodash-set/fp';
import { get, has } from 'lodash/fp';
import { hostFieldsMap } from '@kbn/securitysolution-ecs';
import type {
  HostAggEsItem,
  HostsEdges,
  HostValue,
} from '../../../../../../common/search_strategy/security_solution/hosts';
import { toObjectArrayOfStrings } from '../../../../../../common/utils/to_array';

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
        return set(
          `node.${fieldName}`,
          toObjectArrayOfStrings(fieldValue).map(({ str }) => str),
          flattenedFields
        );
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
  if (has(aggField, bucket)) {
    const valueObj: HostValue = get(aggField, bucket);
    return valueObj.value_as_string;
  } else if (['host.name', 'host.os.name', 'host.os.version'].includes(fieldName)) {
    switch (fieldName) {
      case 'host.name':
        return get('key', bucket) || null;
      case 'host.os.name':
        return get('os.hits.hits[0].fields["host.os.name"]', bucket) || null;
      case 'host.os.version':
        return get('os.hits.hits[0].fields["host.os.version"]', bucket) || null;
    }
  }
  return null;
};
