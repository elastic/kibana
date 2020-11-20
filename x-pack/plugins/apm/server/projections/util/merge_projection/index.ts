/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { cloneDeep, isPlainObject, mergeWith } from 'lodash';
import { DeepPartial } from 'utility-types';
import {
  AggregationInputMap,
  ESSearchBody,
} from '../../../../../../typings/elasticsearch';
import { APMEventESSearchRequest } from '../../../lib/helpers/create_es_client/create_apm_event_client';
import { Projection } from '../../typings';

type PlainObject = Record<string | number | symbol, any>;

type SourceProjection = Omit<DeepPartial<APMEventESSearchRequest>, 'body'> & {
  body: Omit<DeepPartial<ESSearchBody>, 'aggs'> & {
    aggs?: AggregationInputMap;
  };
};

type DeepMerge<T, U> = U extends PlainObject
  ? T extends PlainObject
    ? Omit<T, keyof U> &
        {
          [key in keyof U]: T extends { [k in key]: any }
            ? DeepMerge<T[key], U[key]>
            : U[key];
        }
    : U
  : U;

export function mergeProjection<
  T extends Projection,
  U extends SourceProjection
>(target: T, source: U): DeepMerge<T, U> {
  return mergeWith({}, cloneDeep(target), source, (a, b) => {
    if (isPlainObject(a) && isPlainObject(b)) {
      return undefined;
    }
    return b;
  }) as DeepMerge<T, U>;
}
