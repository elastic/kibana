/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getCallClusterMock } from '../../../common/get_call_cluster.mock';
import { CreateListOptions } from '../lists';
import {
  DATE_NOW,
  DESCRIPTION,
  IMMUTABLE,
  LIST_ID,
  LIST_INDEX,
  META,
  NAME,
  TIE_BREAKER,
  TYPE,
  USER,
  VERSION,
} from '../../../common/constants.mock';

export const getCreateListOptionsMock = (): CreateListOptions => ({
  callCluster: getCallClusterMock(),
  dateNow: DATE_NOW,
  description: DESCRIPTION,
  deserializer: undefined,
  id: LIST_ID,
  immutable: IMMUTABLE,
  listIndex: LIST_INDEX,
  meta: META,
  name: NAME,
  serializer: undefined,
  tieBreaker: TIE_BREAKER,
  type: TYPE,
  user: USER,
  version: VERSION,
});
