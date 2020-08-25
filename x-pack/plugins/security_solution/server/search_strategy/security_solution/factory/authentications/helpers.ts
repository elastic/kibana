/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { mergeFieldsWithHit } from '../../../../utils/build_query';
import { AuthenticationsEdges } from '../../../../../common/search_strategy/security_solution/authentications';
import { AuthenticationHit } from '../../../../lib/authentications/types';

export const formatAuthenticationData = (
  fields: readonly string[],
  hit: AuthenticationHit,
  fieldMap: Readonly<Record<string, string>>
): AuthenticationsEdges =>
  fields.reduce<AuthenticationsEdges>(
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
      return mergeFieldsWithHit(fieldName, flattenedFields, fieldMap, hit);
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
