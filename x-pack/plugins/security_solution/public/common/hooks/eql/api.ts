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
import {
  EqlSearchStrategyRequest,
  EqlSearchStrategyResponse,
} from '../../../../server/search_strategy/eql/types';

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
}: Params): Promise<EqlSearchStrategyResponse> => {
  return data.search
    .search<EqlSearchStrategyRequest, EqlSearchStrategyResponse>(
      { params: { allow_no_indices: true, index, body: { query } }, options: { ignore: [400] } },
      {
        strategy: 'security_eql_base',
        abortSignal: signal,
      }
    )
    .toPromise();
};
