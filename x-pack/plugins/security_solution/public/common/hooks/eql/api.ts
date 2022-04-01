/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lastValueFrom } from 'rxjs';
import type { DataPublicPluginStart } from '../../../../../../../src/plugins/data/public';
import {
  EqlSearchStrategyRequest,
  EqlSearchStrategyResponse,
  EQL_SEARCH_STRATEGY,
} from '../../../../../../../src/plugins/data/common';
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
  const { rawResponse: response } = await lastValueFrom(
    data.search.search<EqlSearchStrategyRequest, EqlSearchStrategyResponse>(
      {
        params: { index: index.join(), body: { query, size: 0 } },
        options: { ignore: [400] },
      },
      {
        strategy: EQL_SEARCH_STRATEGY,
        abortSignal: signal,
      }
    )
  );

  if (isValidationErrorResponse(response.body)) {
    return { valid: false, errors: getValidationErrors(response.body) };
  } else if (isErrorResponse(response.body)) {
    throw new Error(JSON.stringify(response.body));
  } else {
    return { valid: true, errors: [] };
  }
};
