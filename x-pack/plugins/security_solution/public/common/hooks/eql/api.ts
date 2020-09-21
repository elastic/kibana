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
  const { rawEqlResponse: response } = await data.search
    .search<EqlSearchStrategyRequest, EqlSearchStrategyResponse>(
      // @ts-expect-error EqlSearch is missing allow_no_indices
      { params: { allow_no_indices: true, index, body: { query } }, options: { ignore: [400] } },
      {
        strategy: 'security_eql_base',
        abortSignal: signal,
      }
    )
    .toPromise();

  const errors = isValidationErrorResponse(response) ? getValidationErrors(response) : [];
  return {
    errors,
    valid: errors.length === 0,
  };
};
