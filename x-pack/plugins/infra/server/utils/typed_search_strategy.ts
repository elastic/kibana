/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as rt from 'io-ts';
import stringify from 'json-stable-stringify';
import { JsonValue, jsonValueRT } from '../../common/typed_json';
import { SearchStrategyError } from '../../common/search_strategies/common/errors';
import { ShardFailure } from './elasticsearch_runtime_types';

export const jsonFromBase64StringRT = new rt.Type<JsonValue, string, string>(
  'JSONFromBase64String',
  jsonValueRT.is,
  (value, context) => {
    try {
      return rt.success(JSON.parse(Buffer.from(value, 'base64').toString()));
    } catch (error) {
      return rt.failure(error, context);
    }
  },
  (a) => Buffer.from(stringify(a)).toString('base64')
);

export const createAsyncRequestRTs = <StateCodec extends rt.Mixed, ParamsCodec extends rt.Mixed>(
  stateCodec: StateCodec,
  paramsCodec: ParamsCodec
) => {
  const asyncGetRequestRT = rt.type({
    id: stateCodec,
    params: paramsCodec,
  });

  const asyncSubmitRequestRT = rt.type({
    params: paramsCodec,
  });

  const asyncRequestRT = rt.union([asyncGetRequestRT, asyncSubmitRequestRT]);

  return {
    asyncGetRequestRT,
    asyncRequestRT,
    asyncSubmitRequestRT,
  };
};

export const createErrorFromShardFailure = (failure: ShardFailure): SearchStrategyError => ({
  type: 'shardFailure' as const,
  shardInfo: {
    index: failure.index,
    node: failure.node,
    shard: failure.shard,
  },
  message: failure.reason.reason,
});
