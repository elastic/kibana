/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ResponseActionsQueries } from '../../../../common/search_strategy';
import type { EndpointFactoryQueryTypes } from '../../../../common/search_strategy';

import type { AutomatedActionsSearchStrategyFactory } from './types';
import { allActions } from './osquery';

export const automatedActionsFactory: Record<
  EndpointFactoryQueryTypes,
  AutomatedActionsSearchStrategyFactory<EndpointFactoryQueryTypes>
> = {
  [ResponseActionsQueries.actions]: allActions,
};
