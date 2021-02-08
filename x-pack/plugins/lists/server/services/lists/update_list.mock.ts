/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
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
  VERSION,
} from '../../../common/constants.mock';

export const getUpdateListOptionsMock = (): UpdateListOptions => ({
  _version: undefined,
  callCluster: getCallClusterMock(),
  dateNow: DATE_NOW,
  description: DESCRIPTION,
  id: LIST_ID,
  listIndex: LIST_INDEX,
  meta: META,
  name: NAME,
  user: USER,
  version: VERSION,
});
