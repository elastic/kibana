/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TotalUsersKpiStrategyResponse } from './kpi/total_users';

export * from './all';
export * from './common';
export * from './kpi';
export * from './observed_details';
export * from './authentications';

export { UsersQueries } from '../../../api/search_strategy';

export type UsersKpiStrategyResponse = Omit<TotalUsersKpiStrategyResponse, 'rawResponse'>;
