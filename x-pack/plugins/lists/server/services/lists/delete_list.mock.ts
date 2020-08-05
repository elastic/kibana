/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getCallClusterMock } from '../../../common/get_call_cluster.mock';
import { DeleteListOptions } from '../lists';
import { LIST_ID, LIST_INDEX, LIST_ITEM_INDEX } from '../../../common/constants.mock';

export const getDeleteListOptionsMock = (): DeleteListOptions => ({
  callCluster: getCallClusterMock(),
  id: LIST_ID,
  listIndex: LIST_INDEX,
  listItemIndex: LIST_ITEM_INDEX,
});
