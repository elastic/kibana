/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get, getOr, isEmpty } from 'lodash/fp';
import { set } from '@elastic/safer-lodash-set/fp';
import { toObjectArrayOfStrings } from '../../../../../../common/utils/to_array';
import {
  AuthenticationsEdges,
  AuthenticationHit,
  AuthenticationBucket,
  FactoryQueryTypes,
  StrategyResponseType,
} from '../../../../../../common/search_strategy/security_solution';

export const authenticationsLastSuccessFields = ['timestamp', 'source.ip', 'host.id', 'host.name'];
export const authenticationsLastFailureFields = ['timestamp', 'source.ip', 'host.id', 'host.name'];

export const formatAuthenticationData = (
  hit: AuthenticationHit,
  fieldMap: Readonly<Record<string, unknown>>
): AuthenticationsEdges => {
  let flattenedFields = {
    node: {
      _id: hit._id,
      stackedValue: [hit.stackedValue],
      failures: hit.failures,
      successes: hit.successes,
    },
    cursor: {
      value: hit.cursor,
      tiebreaker: null,
    },
  };

  const lastSuccessFields = getFormattedFields(
    authenticationsLastSuccessFields,
    hit,
    fieldMap,
    'lastSuccess'
  );
  if (lastSuccessFields) {
    console.log('jj');
    flattenedFields = set('lastSuccess.node', lastSuccessFields, flattenedFields);
  }

  const lastFailureFields = getFormattedFields(
    authenticationsLastFailureFields,
    hit,
    fieldMap,
    'lasFailure'
  );
  if (lastSuccessFields) {
    flattenedFields = set('lastFailure.node', lastFailureFields, flattenedFields);
  }
  return flattenedFields;
};

const getFormattedFields = (
  fields: string[],
  hit: AuthenticationHit,
  fieldMap: Readonly<Record<string, unknown>>,
  parentField: string
) => {
  return fields.reduce((flattenedFields, fieldName) => {
    const fieldPath = `${fieldName}`;
    const esField = get(`${parentField}['${fieldName}']`, fieldMap);

    if (!isEmpty(esField)) {
      const fieldValue = get(`${parentField}['${esField}']`, hit.fields);

      if (!isEmpty(fieldValue)) {
        flattenedFields = set(
          fieldPath,
          toObjectArrayOfStrings(fieldValue).map(({ str }) => str),
          flattenedFields
        );
      }
    }
    console.log(flattenedFields);

    return flattenedFields;
  }, {});
};

export const getHits = <T extends FactoryQueryTypes>(response: StrategyResponseType<T>) =>
  getOr([], 'aggregations.stack_by.buckets', response.rawResponse).map(
    (bucket: AuthenticationBucket) => ({
      _id: getOr(
        `${bucket.key}+${bucket.doc_count}`,
        'failures.lastFailure.hits.hits[0]._id',
        bucket
      ),
      fields: {
        lastSuccess: getOr(null, 'successes.lastSuccess.hits.hits[0].fields', bucket),
        lastFailure: getOr(null, 'failures.lastFailure.hits.hits[0].fields', bucket),
      },
      stackedValue: bucket.key,
      failures: bucket.failures.doc_count,
      successes: bucket.successes.doc_count,
    })
  );
