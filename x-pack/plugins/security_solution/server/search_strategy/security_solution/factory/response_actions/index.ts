/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FactoryQueryTypes } from '../../../../../common/search_strategy';
import { ResponseActionsQueries } from '../../../../../common/search_strategy/security_solution/response_actions';
import type { SecuritySolutionFactory } from '../types';
import { allActions } from './actions';
import { actionResults } from './results';

export const responseActionsFactory: Record<
  ResponseActionsQueries,
  SecuritySolutionFactory<FactoryQueryTypes>
> = {
  [ResponseActionsQueries.actions]: allActions,
  [ResponseActionsQueries.results]: actionResults,
};
