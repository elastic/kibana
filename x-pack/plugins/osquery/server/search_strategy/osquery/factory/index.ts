/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FactoryQueryTypes, OsqueryQueries } from '../../../../common/search_strategy/osquery';

import { allAgents } from './agents';

import { OsqueryFactory } from './types';

export const osqueryFactory: Record<FactoryQueryTypes, OsqueryFactory<FactoryQueryTypes>> = {
  [OsqueryQueries.agents]: allAgents,
};
