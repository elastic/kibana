/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DataPublicPluginStart } from '../../../../../../../src/plugins/data/public';
import {
  EqlSearchStrategyRequest,
  EqlSearchStrategyResponse,
} from '../../../../../data_enhanced/common';
import { EqlValidationSchema as EqlValidationRequest } from '../../../../common/detection_engine/schemas/request/eql_validation_schema';
import { EqlValidationSchema as EqlValidationResponse } from '../../../../common/detection_engine/schemas/response/eql_validation_schema';
import {
  getValidationErrors,
  isErrorResponse,
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

  if (isValidationErrorResponse(response.body)) {
    return { valid: false, errors: getValidationErrors(response.body) };
  } else if (isErrorResponse(response.body)) {
    throw new Error(JSON.stringify(response.body));
  } else {
    return { valid: true, errors: [] };
  }
};
