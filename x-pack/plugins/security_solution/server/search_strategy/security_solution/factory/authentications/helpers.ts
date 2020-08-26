/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { get } from 'lodash/fp';
import { set } from '@elastic/safer-lodash-set/fp';
import { mergeFieldsWithHit } from '../../../../utils/build_query';
import {
  AuthenticationsEdges,
  AuthenticationHit,
} from '../../../../../common/search_strategy/security_solution/authentications';
import { toArray } from '../../../helpers/to_array';

export const authenticationFields = [
  '_id',
  'failures',
  'successes',
  'user.name',
  'lastSuccess.timestamp',
  'lastSuccess.source.ip',
  'lastSuccess.host.id',
  'lastSuccess.host.name',
  'lastFailure.timestamp',
  'lastFailure.source.ip',
  'lastFailure.host.id',
  'lastFailure.host.name',
];

export const formatAuthenticationData = (
  hit: AuthenticationHit,
  fieldMap: Readonly<Record<string, string>>
): AuthenticationsEdges =>
  authenticationFields.reduce<AuthenticationsEdges>(
    (flattenedFields, fieldName) => {
      if (hit.cursor) {
        flattenedFields.cursor.value = hit.cursor;
      }
      flattenedFields.node = {
        ...flattenedFields.node,
        ...{
          _id: hit._id,
          user: { name: [hit.user] },
          failures: hit.failures,
          successes: hit.successes,
        },
      };
      const mergedResult = mergeFieldsWithHit(fieldName, flattenedFields, fieldMap, hit);
      const fieldPath = `node.${fieldName}`;
      const fieldValue = get(fieldPath, mergedResult);

      return set(fieldPath, toArray(fieldValue), mergedResult);
    },
    {
      node: {
        failures: 0,
        successes: 0,
        _id: '',
        user: {
          name: [''],
        },
      },
      cursor: {
        value: '',
        tiebreaker: null,
      },
    }
  );
