/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FactoryQueryTypes } from '../../../../../common/search_strategy';
import { EntityStoreQueries } from '../../../../../common/search_strategy';
import type { SecuritySolutionFactory } from '../types';
import { entityStore } from './entity_store';

export const entityStoreFactory: Record<
  EntityStoreQueries,
  SecuritySolutionFactory<FactoryQueryTypes>
> = {
  [EntityStoreQueries.entityStore]: entityStore,
};
