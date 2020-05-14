/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { getCallClusterMock } from '../../../common/get_call_cluster.mock';
import { UpdateListOptions } from '../lists';
import {
  DATE_NOW,
  DESCRIPTION,
  LIST_ID,
  LIST_INDEX,
  META,
  NAME,
  USER,
} from '../../../common/constants.mock';

export const getUpdateListOptionsMock = (): UpdateListOptions => ({
  callCluster: getCallClusterMock(),
  dateNow: DATE_NOW,
  description: DESCRIPTION,
  id: LIST_ID,
  listIndex: LIST_INDEX,
  meta: META,
  name: NAME,
  user: USER,
});
