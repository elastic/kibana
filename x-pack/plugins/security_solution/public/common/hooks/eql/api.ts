/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DataPublicPluginStart } from '../../../../../../../src/plugins/data/public';
import { EqlValidationSchema as EqlValidationRequest } from '../../../../common/detection_engine/schemas/request/eql_validation_schema';
import { EqlValidationSchema as EqlValidationResponse } from '../../../../common/detection_engine/schemas/response/eql_validation_schema';
import {
  EqlSearchStrategyRequest,
  EqlSearchStrategyResponse,
  getValidationErrors,
  isValidationErrorResponse,
} from '../../../../common/search_strategy/eql';

interface Params extends EqlValidationRequest {
  data: DataPublicPluginStart;
  signal: AbortSignal;
}

export const validateEql = async ({
  data,
  index,
  query,
  signal,
}: Params): Promise<EqlValidationResponse> => {
  const { rawResponse: response } = await data.search
    .search<EqlSearchStrategyRequest, EqlSearchStrategyResponse>(
      {
        // @ts-expect-error allow_no_indices is missing on EqlSearch
        params: { allow_no_indices: true, index: index.join(), body: { query } },
        options: { ignore: [400] },
      },
      {
        strategy: 'eql',
        abortSignal: signal,
      }
    )
    .toPromise();

  const errors = isValidationErrorResponse(response.body) ? getValidationErrors(response.body) : [];
  return {
    errors,
    valid: errors.length === 0,
  };
};
