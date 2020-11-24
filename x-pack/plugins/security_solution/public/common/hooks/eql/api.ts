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
import { EQL_SEARCH_STRATEGY } from '../../../../../data_enhanced/public';
import {
  getValidationErrors,
  isErrorResponse,
  isValidationErrorResponse,
} from '../../../../common/search_strategy/eql';

interface Params {
  index: string[];
  query: string;
  data: DataPublicPluginStart;
  signal: AbortSignal;
}

export const validateEql = async ({
  data,
  index,
  query,
  signal,
}: Params): Promise<{ valid: boolean; errors: string[] }> => {
  const { rawResponse: response } = await data.search
    .search<EqlSearchStrategyRequest, EqlSearchStrategyResponse>(
      {
        params: { index: index.join(), body: { query, size: 0 } },
        options: { ignore: [400] },
      },
      {
        strategy: EQL_SEARCH_STRATEGY,
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
