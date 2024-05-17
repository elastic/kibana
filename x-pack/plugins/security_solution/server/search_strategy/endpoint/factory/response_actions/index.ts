/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EndpointFactoryQueryTypes } from '../../../../../common/search_strategy/endpoint';
import { ResponseActionsQueries } from '../../../../../common/search_strategy/endpoint/response_actions';
import type { EndpointFactory } from '../types';
import { allActions } from './actions';
import { actionResults } from './results';

export const responseActionsFactory: Record<
  ResponseActionsQueries,
  EndpointFactory<EndpointFactoryQueryTypes>
> = {
  [ResponseActionsQueries.actions]: allActions,
  [ResponseActionsQueries.results]: actionResults,
};
