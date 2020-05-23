/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { GetListItemByValuesOptions } from '../items';

import { getCallClusterMock } from './get_call_cluster_mock';
import { LIST_ID, LIST_ITEM_INDEX, TYPE, VALUE, VALUE_2 } from './lists_services_mock_constants';

export const getListItemByValuesOptionsMocks = (): GetListItemByValuesOptions => ({
  callCluster: getCallClusterMock(),
  listId: LIST_ID,
  listItemIndex: LIST_ITEM_INDEX,
  type: TYPE,
  value: [VALUE, VALUE_2],
});
