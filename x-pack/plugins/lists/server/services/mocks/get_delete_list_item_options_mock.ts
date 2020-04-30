/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DeleteListItemOptions } from '../items';

import { getCallClusterMock } from './get_call_cluster_mock';
import { LIST_ITEM_ID, LIST_ITEM_INDEX } from './lists_services_mock_constants';

export const getDeleteListItemOptionsMock = (): DeleteListItemOptions => ({
  callCluster: getCallClusterMock(),
  id: LIST_ITEM_ID,
  listItemIndex: LIST_ITEM_INDEX,
});
