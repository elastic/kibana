/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Query, esFilters } from 'src/plugins/data/public';
import { AlertListData } from '../../types';

// TODO: Move
interface SearchFilterPayload {
  query: Query;
  filters: esFilters.Filter[];
}

interface ServerReturnedAlertsData {
  type: 'serverReturnedAlertsData';
  payload: AlertListData;
}

interface UserAppliedAlertsSearchFilter {
  type: 'userAppliedAlertsSearchFilter';
  payload: Query;
}

export type AlertAction = ServerReturnedAlertsData | UserAppliedAlertsSearchFilter;
