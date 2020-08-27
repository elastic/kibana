/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// To be able to use the type guards on the client side, we need to make sure we don't import
// the code of '@kbn/config-schema' but just its types, otherwise the client side code will
// fail to build.
import type { GetTransformsResponseSchema } from './transforms';
import type { GetTransformsStatsResponseSchema } from './transforms_stats';

const isGenericResponseSchema = <T>(arg: any): arg is T => {
  return (
    {}.hasOwnProperty.call(arg, 'count') &&
    {}.hasOwnProperty.call(arg, 'transforms') &&
    Array.isArray(arg.transforms)
  );
};

export const isGetTransformsResponseSchema = (arg: any): arg is GetTransformsResponseSchema => {
  return isGenericResponseSchema<GetTransformsResponseSchema>(arg);
};

export const isGetTransformsStatsResponseSchema = (
  arg: any
): arg is GetTransformsStatsResponseSchema => {
  return isGenericResponseSchema<GetTransformsStatsResponseSchema>(arg);
};
