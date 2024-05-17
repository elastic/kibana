/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IEsSearchResponse } from '@kbn/search-types';
import type {
  ActionRequestOptions,
  ActionRequestStrategyResponse,
  ActionResponsesRequestOptions,
  ActionResponsesRequestStrategyResponse,
  ResponseActionsQueries,
} from './response_actions';
import type { ActionResponsesRequestStrategyParseResponse } from './response_actions/response';

export type EndpointFactoryQueryTypes = ResponseActionsQueries;

export type EndpointStrategyParseResponseType<T extends EndpointFactoryQueryTypes> =
  T extends ResponseActionsQueries.results
    ? ActionResponsesRequestStrategyParseResponse
    : IEsSearchResponse;

export type EndpointStrategyResponseType<T extends EndpointFactoryQueryTypes> =
  T extends ResponseActionsQueries.actions
    ? ActionRequestStrategyResponse
    : T extends ResponseActionsQueries.results
      ? ActionResponsesRequestStrategyResponse
      : never;

export type EndpointStrategyRequestType<T extends EndpointFactoryQueryTypes> =
  T extends ResponseActionsQueries.actions
    ? ActionRequestOptions
    : T extends ResponseActionsQueries.results
      ? ActionResponsesRequestOptions
      : never;
