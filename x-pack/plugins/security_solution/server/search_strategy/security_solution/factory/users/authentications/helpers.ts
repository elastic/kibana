/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get, getOr, isEmpty } from 'lodash/fp';
import { set } from '@elastic/safer-lodash-set/fp';
import { mergeFieldsWithHit } from '../../../../../utils/build_query';
import { toObjectArrayOfStrings } from '../../../../../../common/utils/to_array';
import {
  AuthenticationsEdges,
  AuthenticationHit,
  AuthenticationBucket,
  FactoryQueryTypes,
  StrategyResponseType,
} from '../../../../../../common/search_strategy/security_solution';

export const authenticationsFields = [
  '_id',
  'failures',
  'successes',
  'stackedValue',
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
  fields: readonly string[] = authenticationsFields,
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
          stackedValue: [hit.stackedValue],
          failures: hit.failures,
          successes: hit.successes,
        },
      };
      const mergedResult = mergeFieldsWithHit(fieldName, flattenedFields, fieldMap, hit);
      const fieldPath = `node.${fieldName}`;
      const fieldValue = get(fieldPath, mergedResult);
      if (!isEmpty(fieldValue)) {
        return set(
          fieldPath,
          toObjectArrayOfStrings(fieldValue).map(({ str }) => str),
          mergedResult
        );
      } else {
        return mergedResult;
      }
    },
    {
      node: {
        failures: 0,
        successes: 0,
        _id: '',
        stackedValue: [''],
      },
      cursor: {
        value: '',
        tiebreaker: null,
      },
    }
  );

export const getHits = <T extends FactoryQueryTypes>(response: StrategyResponseType<T>) =>
  getOr([], 'aggregations.stack_by.buckets', response.rawResponse).map(
    (bucket: AuthenticationBucket) => ({
      _id: getOr(
        `${bucket.key}+${bucket.doc_count}`,
        'failures.lastFailure.hits.hits[0].id',
        bucket
      ),
      _source: {
        lastSuccess: getOr(null, 'successes.lastSuccess.hits.hits[0]._source', bucket),
        lastFailure: getOr(null, 'failures.lastFailure.hits.hits[0]._source', bucket),
      },
      stackedValue: bucket.key,
      failures: bucket.failures.doc_count,
      successes: bucket.successes.doc_count,
    })
  );

export const getHitsEntities = <T extends FactoryQueryTypes>(response: StrategyResponseType<T>) =>
  getOr([], 'aggregations.stack_by.buckets', response.rawResponse).map(
    (bucket: AuthenticationBucket) => ({
      _id: getOr(
        `${bucket.key}+${bucket.doc_count}`,
        'failures.lastFailure.hits.hits[0].id',
        bucket
      ),
      _source: {
        lastSuccess: getOr(null, 'successes.lastSuccess.hits.hits[0]._source', bucket),
        lastFailure: getOr(null, 'failures.lastFailure.hits.hits[0]._source', bucket),
      },
      stackedValue: bucket.key,
      failures: bucket.failures.value,
      successes: bucket.successes.value,
    })
  );

export const formatAuthenticationEntitiesData = (
  fields: readonly string[] = authenticationsFields,
  hit: AuthenticationHit,
  fieldMap: Readonly<Record<string, string>>
): AuthenticationsEdges => {
  return fields.reduce<AuthenticationsEdges>(
    (flattenedFields, fieldName) => {
      if (hit.cursor) {
        flattenedFields.cursor.value = hit.cursor;
      }
      flattenedFields.node = {
        ...flattenedFields.node,
        ...{
          _id: hit._id,
          stackedValue: [hit.stackedValue],
          failures: hit.failures,
          successes: hit.successes,
        },
      };
      const mergedResult = mergeFieldsWithHit(fieldName, flattenedFields, fieldMap, hit);
      const fieldPath = `node.${fieldName}`;
      const fieldValue = get(fieldPath, mergedResult);
      if (!isEmpty(fieldValue)) {
        return set(
          fieldPath,
          toObjectArrayOfStrings(fieldValue).map(({ str }) => str),
          mergedResult
        );
      } else {
        return mergedResult;
      }
    },
    {
      node: {
        failures: 0,
        successes: 0,
        _id: '',
        stackedValue: [''],
      },
      cursor: {
        value: '',
        tiebreaker: null,
      },
    }
  );
};
