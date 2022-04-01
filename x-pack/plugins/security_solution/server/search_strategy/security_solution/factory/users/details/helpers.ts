/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { set } from '@elastic/safer-lodash-set/fp';
import { get, has } from 'lodash/fp';
import {
  UserAggEsItem,
  UserBuckets,
  UserItem,
} from '../../../../../../common/search_strategy/security_solution/users/common';

export const USER_FIELDS = [
  'user.id',
  'user.domain',
  'user.name',
  'host.os.name',
  'host.ip',
  'host.os.family',
];

export const fieldNameToAggField = (fieldName: string) => fieldName.replace(/\./g, '_');

export const formatUserItem = (aggregations: UserAggEsItem): UserItem => {
  const firstLastSeen = {
    firstSeen: get('first_seen.value_as_string', aggregations),
    lastSeen: get('last_seen.value_as_string', aggregations),
  };

  return USER_FIELDS.reduce<UserItem>((flattenedFields, fieldName) => {
    const aggField = fieldNameToAggField(fieldName);

    if (has(aggField, aggregations)) {
      const data: UserBuckets = get(aggField, aggregations);
      const fieldValue = data.buckets.map((obj) => obj.key);

      return set(fieldName, fieldValue, flattenedFields);
    }
    return flattenedFields;
  }, firstLastSeen);
};
