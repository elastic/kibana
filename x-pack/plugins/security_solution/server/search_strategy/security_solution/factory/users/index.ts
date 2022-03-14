/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FactoryQueryTypes } from '../../../../../common/search_strategy/security_solution';
import { UsersQueries } from '../../../../../common/search_strategy/security_solution/users';

import { SecuritySolutionFactory } from '../types';
import { userDetails } from './details';

export const usersFactory: Record<UsersQueries, SecuritySolutionFactory<FactoryQueryTypes>> = {
  [UsersQueries.details]: userDetails,
};
