/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FactoryQueryTypes } from '../../../../../common/search_strategy/security_solution';
import { UsersQueries } from '../../../../../common/search_strategy/security_solution/users';

import { SecuritySolutionFactory } from '../types';
import { allUsers } from './all';
import { userDetails } from './details';
import { totalUsersKpi } from './kpi/total_users';

export const usersFactory: Record<UsersQueries, SecuritySolutionFactory<FactoryQueryTypes>> = {
  [UsersQueries.details]: userDetails,
  [UsersQueries.kpiTotalUsers]: totalUsersKpi,
  [UsersQueries.users]: allUsers,
};
