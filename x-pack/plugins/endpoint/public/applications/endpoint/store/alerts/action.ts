/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IIndexPattern } from 'src/plugins/data/public';
import { Immutable, AlertDetails } from '../../../../../common/types';
import { AlertListData } from '../../types';

interface ServerReturnedAlertsData {
  readonly type: 'serverReturnedAlertsData';
  readonly payload: Immutable<AlertListData>;
}

interface ServerReturnedAlertDetailsData {
  readonly type: 'serverReturnedAlertDetailsData';
  readonly payload: Immutable<AlertDetails>;
}

interface ServerReturnedSearchBarIndexPatterns {
  type: 'serverReturnedSearchBarIndexPatterns';
  payload: IIndexPattern[];
}

export type AlertAction =
  | ServerReturnedAlertsData
  | ServerReturnedAlertDetailsData
  | ServerReturnedSearchBarIndexPatterns;
