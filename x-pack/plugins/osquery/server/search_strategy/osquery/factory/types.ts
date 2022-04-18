/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IEsSearchResponse, ISearchRequestParams } from '@kbn/data-plugin/common';
import {
  FactoryQueryTypes,
  StrategyRequestType,
  StrategyResponseType,
} from '../../../../common/search_strategy/osquery';

export interface OsqueryFactory<T extends FactoryQueryTypes> {
  buildDsl: (options: StrategyRequestType<T>) => ISearchRequestParams;
  parse: (
    options: StrategyRequestType<T>,
    response: IEsSearchResponse
  ) => Promise<StrategyResponseType<T>>;
}
