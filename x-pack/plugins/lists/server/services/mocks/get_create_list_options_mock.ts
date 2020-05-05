/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CreateListOptions } from '../lists';

import { getCallClusterMock } from './get_call_cluster_mock';
import {
  DATE_NOW,
  DESCRIPTION,
  LIST_ID,
  LIST_INDEX,
  META,
  NAME,
  TIE_BREAKER,
  TYPE,
  USER,
} from './lists_services_mock_constants';

export const getCreateListOptionsMock = (): CreateListOptions => ({
  callCluster: getCallClusterMock(),
  dateNow: DATE_NOW,
  description: DESCRIPTION,
  id: LIST_ID,
  listIndex: LIST_INDEX,
  meta: META,
  name: NAME,
  tieBreaker: TIE_BREAKER,
  type: TYPE,
  user: USER,
});
