/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FactoryQueryTypes, OsqueryQueries } from '../../../../common/search_strategy/osquery';

import { allActions, actionDetails, actionResults } from './actions';
import { allAgents } from './agents';
import { allResults } from './results';

import { OsqueryFactory } from './types';

export const osqueryFactory: Record<FactoryQueryTypes, OsqueryFactory<FactoryQueryTypes>> = {
  [OsqueryQueries.actions]: allActions,
  [OsqueryQueries.actionDetails]: actionDetails,
  [OsqueryQueries.actionResults]: actionResults,
  [OsqueryQueries.agents]: allAgents,
  [OsqueryQueries.results]: allResults,
};
