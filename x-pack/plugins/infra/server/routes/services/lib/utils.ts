/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { RouteValidationError, RouteValidationResultFactory } from '@kbn/core/server';
import { isLeft } from 'fp-ts/Either';
import { servicesFiltersRT, ServicesFilter } from '../../../../common/http_api/services';

type ValidateStringAssetFiltersReturn = [{ error: RouteValidationError }] | [null, ServicesFilter];

export function validateStringAssetFilters(
  q: any,
  res: RouteValidationResultFactory
): ValidateStringAssetFiltersReturn {
  try {
    const parsedFilters = JSON.parse(q.stringFilters);
    const validationResult = servicesFiltersRT.decode(parsedFilters);
    if (isLeft(validationResult)) {
      return [res.badRequest(new Error(`Invalid asset filters - ${q.filters}`))];
    } else {
      return [null, validationResult.right];
    }
  } catch (err: any) {
    return [res.badRequest(err)];
  }
}
