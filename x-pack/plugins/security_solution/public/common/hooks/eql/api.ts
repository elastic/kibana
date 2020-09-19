/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DataPublicPluginStart } from '../../../../../../../src/plugins/data/public';
import { EqlQueryTypes } from '../../../../common/search_strategy/eql';
import {
  ValidationStrategyRequest,
  ValidationStrategyResponse,
} from '../../../../common/search_strategy/eql/validation';

interface Params {
  data: DataPublicPluginStart;
  index: string[];
  query: string;
  signal: AbortSignal;
}

export const validateEql = ({
  data,
  index,
  query,
  signal,
}: Params): Promise<ValidationStrategyResponse> => {
  return data.search
    .search<ValidationStrategyRequest, ValidationStrategyResponse>(
      { factoryQueryType: EqlQueryTypes.validation, index, query },
      {
        strategy: 'eql',
        abortSignal: signal,
      }
    )
    .toPromise();
};
