/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { firstValueFrom } from 'rxjs';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { EqlSearchStrategyRequest, EqlSearchStrategyResponse } from '@kbn/data-plugin/common';
import { EQL_SEARCH_STRATEGY } from '@kbn/data-plugin/common';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import {
  getValidationErrors,
  isErrorResponse,
  isValidationErrorResponse,
} from '../../../../common/search_strategy/eql';

interface Params {
  dataViewTitle: string;
  query: string;
  data: DataPublicPluginStart;
  signal: AbortSignal;
  runtimeMappings: estypes.MappingRuntimeFields | undefined;
}

export const validateEql = async ({
  data,
  dataViewTitle,
  query,
  signal,
  runtimeMappings,
}: Params): Promise<{ valid: boolean; errors: string[] }> => {
  const { rawResponse: response } = await firstValueFrom(
    data.search.search<EqlSearchStrategyRequest, EqlSearchStrategyResponse>(
      {
        params: {
          index: dataViewTitle,
          body: { query, runtime_mappings: runtimeMappings, size: 0 },
        },
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
