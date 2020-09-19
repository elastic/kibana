/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ApiResponse } from '@elastic/elasticsearch';
import { EqlSearch } from '@elastic/elasticsearch/api/requestParams';
import {
  EqlQueryTypes,
  EqlStrategyRequestType,
  EqlStrategyResponseType,
} from '../../../../common/search_strategy/eql';

export interface EqlQueryFactory<T extends EqlQueryTypes> {
  buildDsl: (request: EqlStrategyRequestType<T>) => EqlSearch;
  parse: (
    request: EqlStrategyRequestType<T>,
    response: ApiResponse<unknown>
  ) => Promise<EqlStrategyResponseType<T>>;
}
