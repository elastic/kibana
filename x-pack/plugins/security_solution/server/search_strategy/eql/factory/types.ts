/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  IEsSearchRequest,
  IEsSearchResponse,
  ISearchOptions,
} from '../../../../../../../src/plugins/data/common';
import {
  EqlQueryTypes,
  EqlStrategyRequestType,
  EqlStrategyResponseType,
} from '../../../../common/search_strategy/eql';

export interface EqlQueryFactory<T extends EqlQueryTypes> {
  buildRequest: (request: EqlStrategyRequestType<T>) => IEsSearchRequest;
  buildOptions: (
    request: EqlStrategyRequestType<T>,
    options?: ISearchOptions
  ) => ISearchOptions | undefined;
  parse: (
    request: EqlStrategyRequestType<T>,
    response: IEsSearchResponse<unknown>
  ) => Promise<EqlStrategyResponseType<T>>;
}
