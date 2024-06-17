/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  RequestHandlerContext,
  RouteValidationError,
  RouteValidationResultFactory,
} from '@kbn/core/server';
import { AssetFilters, assetFiltersSingleKindRT } from '../../common/types_api';

export async function getClientsFromContext<T extends RequestHandlerContext>(context: T) {
  const coreContext = await context.core;

  return {
    coreContext,
    elasticsearchClient: coreContext.elasticsearch.client.asCurrentUser,
    savedObjectsClient: coreContext.savedObjects.client,
  };
}

type ValidateStringAssetFiltersReturn =
  | [{ error: RouteValidationError }]
  | [null, AssetFilters | undefined];

export function validateStringAssetFilters(
  q: any,
  res: RouteValidationResultFactory
): ValidateStringAssetFiltersReturn {
  if (typeof q.stringFilters === 'string') {
    try {
      const parsedFilters = JSON.parse(q.stringFilters);
      if (assetFiltersSingleKindRT.is(parsedFilters)) {
        return [null, parsedFilters];
      } else {
        return [res.badRequest(new Error(`Invalid asset filters - ${q.filters}`))];
      }
    } catch (err: any) {
      return [res.badRequest(err)];
    }
  }
  return [null, undefined];
}
