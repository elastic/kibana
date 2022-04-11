/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TotalUsersKpiStrategyResponse } from './kpi/total_users';

export * from './all';
export * from './common';
export * from './kpi';
export * from './details';
export * from './authentications';

export enum UsersQueries {
  details = 'userDetails',
  kpiTotalUsers = 'usersKpiTotalUsers',
  users = 'allUsers',
  authentications = 'authentications',
  authenticationsEntities = 'authenticationsEntities',
}

export type UserskKpiStrategyResponse = Omit<TotalUsersKpiStrategyResponse, 'rawResponse'>;
