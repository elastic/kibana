/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DeleteListOptions } from '../lists';

import { getCallClusterMock } from './get_call_cluster_mock';
import { LIST_ID, LIST_INDEX, LIST_ITEM_INDEX } from './lists_services_mock_constants';

export const getDeleteListOptionsMock = (): DeleteListOptions => ({
  callCluster: getCallClusterMock(),
  id: LIST_ID,
  listIndex: LIST_INDEX,
  listItemIndex: LIST_ITEM_INDEX,
});
