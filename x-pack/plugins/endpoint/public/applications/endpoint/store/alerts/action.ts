/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IIndexPattern } from 'src/plugins/data/public';
import { AlertListData, UserUpdatedAlertsSearchBarFilterPayload } from '../../types';

interface ServerReturnedAlertsData {
  type: 'serverReturnedAlertsData';
  payload: AlertListData;
}

interface ServerReturnedSearchBarIndexPatterns {
  type: 'serverReturnedSearchBarIndexPatterns';
  payload: IIndexPattern[];
}

interface UserUpdatedAlertsSearchBarFilter {
  type: 'userUpdatedAlertsSearchBarFilter';
  payload: UserUpdatedAlertsSearchBarFilterPayload;
}

interface UserSubmittedAlertsSearchBarFilter {
  type: 'userSubmittedAlertsSearchBarFilter';
  payload: UserUpdatedAlertsSearchBarFilterPayload;
}

export type AlertAction =
  | ServerReturnedAlertsData
  | ServerReturnedSearchBarIndexPatterns
  | UserUpdatedAlertsSearchBarFilter
  | UserSubmittedAlertsSearchBarFilter;
