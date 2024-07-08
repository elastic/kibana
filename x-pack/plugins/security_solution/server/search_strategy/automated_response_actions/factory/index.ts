/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ResponseActionsQueries } from '../../../../common/search_strategy/endpoint/response_actions';
import type { EndpointFactoryQueryTypes } from '../../../../common/search_strategy/endpoint';

import type { AutomatedActionsSearchStrategyFactory } from './types';
import { allActions } from './osquery';

export const responseActionsFactory: Record<
  ResponseActionsQueries,
  AutomatedActionsSearchStrategyFactory<EndpointFactoryQueryTypes>
> = {
  [ResponseActionsQueries.actions]: allActions,
};

export const endpointFactory: Record<
  EndpointFactoryQueryTypes,
  AutomatedActionsSearchStrategyFactory<EndpointFactoryQueryTypes>
> = {
  ...responseActionsFactory,
};
