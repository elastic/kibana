/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ISearchRequestParams } from '@kbn/search-types';
import type {
  EndpointFactoryQueryTypes,
  EndpointStrategyRequestType,
  EndpointStrategyResponseType,
} from '../../../../common/search_strategy/endpoint';

export interface AutomatedActionsSearchStrategyFactory<T extends EndpointFactoryQueryTypes> {
  buildDsl: (options: EndpointStrategyRequestType<T>) => ISearchRequestParams;
  parse: (
    options: EndpointStrategyRequestType<T>,
    response: EndpointStrategyResponseType<T>
  ) => Promise<EndpointStrategyResponseType<T>>;
}
